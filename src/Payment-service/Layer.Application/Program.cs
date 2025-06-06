﻿using Microsoft.OpenApi.Models;
using Layer.Domain.Interfaces;
using Layer.Services;
using Layer.Services.Services;
using Layer.Infrastructure.Database;
using Microsoft.EntityFrameworkCore;
using DotNetEnv;
using Microsoft.Extensions.Options;
using Microsoft.Extensions.Configuration;
using Layer.Domain.Entities;
using Layer.Domain.Enums;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.IdentityModel.Tokens;
using System.Text;
using Layer.Infrastructure.ServicesExternal;
using Layer.Infrastructure.ServicesInternal;
using Google.Apis.Auth.OAuth2;
using FirebaseAdmin;
using MongoDB.Driver;

var builder = WebApplication.CreateBuilder(args);

// Carregar variáveis de ambiente do arquivo .env
var env = builder.Environment.EnvironmentName;

if (env == "Development")
{
    Env.Load(".env.development");
}
else if (env == "Production")
{
    Env.Load(".env.production");
}
else
{
    Env.Load();  // Caso você tenha um `.env` padrão
}


// Sobrepor os valores das variáveis no appsettings.json com as variáveis do ambiente
builder.Configuration.AddEnvironmentVariables();

var mongoSettings = new MongoDbSettings
{
    ConnectionString = Environment.GetEnvironmentVariable("MONGO_CONNECTION_STRING"),
    DatabaseName = Environment.GetEnvironmentVariable("MONGO_DATABASE_NAME"),
    LogsCollectionName = Environment.GetEnvironmentVariable("MONGO_LOGS_COLLECTION_NAME") ?? "Logs"
};

// Definir o caminho do arquivo de credenciais Firebase corretamente
string filePath = Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "administradora-kk-firebase-adminsdk-1fa3k-7b4c700bd8.json");

if (!File.Exists(filePath))
{
    filePath = "/etc/secrets/administradora-kk-firebase-adminsdk-1fa3k-7b4c700bd8.json";
}

// Definir a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS
Environment.SetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS", filePath);




// Verificar se a variável de ambiente FIREBASE_CREDENTIALS_PATH foi configurada corretamente
var firebaseCredentialsPath = Environment.GetEnvironmentVariable("GOOGLE_APPLICATION_CREDENTIALS");

// Verificar se o caminho está correto antes de usar o arquivo
if (!string.IsNullOrEmpty(firebaseCredentialsPath) && File.Exists(firebaseCredentialsPath))
{
    // Criar a credencial do Google a partir do arquivo de credenciais
    var googleCredential = GoogleCredential.FromFile(firebaseCredentialsPath);

    // Inicializar o FirebaseApp usando as credenciais
    FirebaseApp.Create(new AppOptions()
    {
        Credential = googleCredential
    });

    Console.WriteLine("Firebase initialized with credentials from: " + firebaseCredentialsPath);
}
else
{
    // Lidar com erro de arquivo não encontrado ou variável de ambiente não configurada corretamente
    Console.WriteLine("Error: Firebase credentials file not found or environment variable not set.");
}


builder.Services.AddHttpClient();

AppContext.SetSwitch("Npgsql.EnableLegacyTimestampBehavior", true);

// Configurar o DbContext
builder.Services.AddDbContext<AppDbContext>(options =>
    options.UseNpgsql(
        builder.Configuration.GetConnectionString("DefaultConnection"),
        npgsqlOptions =>
        {
            npgsqlOptions.EnableRetryOnFailure(
                maxRetryCount: 5,
                maxRetryDelay: TimeSpan.FromSeconds(30),
                errorCodesToAdd: new[] { "57P01", "08001", "08006", "40001" }
                );
            npgsqlOptions.CommandTimeout(60); // Timeout de 30 segundos
        })
    // .UseQueryTrackingBehavior(QueryTrackingBehavior.NoTracking) // Desabilitar rastreamento de mudanças para melhorar a performance
);

builder.Services.AddSingleton(mongoSettings);
builder.Services.AddSingleton<IMongoClient>(sp => new MongoClient(mongoSettings.ConnectionString));

// Registrar o serviço de pagamentos (IPaymentService / PaymentService)
builder.Services.AddScoped<IPaymentService, PaymentService>();
builder.Services.AddScoped<IEmailSender, EmailSenderService>();
builder.Services.AddHostedService<PaymentReminderService>();

// Injeção de dependências de outros serviços
builder.Services.AddScoped<ICountryService, CountryService>();
builder.Services.AddScoped<ITokenService, TokenService>();
builder.Services.AddScoped<CountryService>();
builder.Services.AddScoped<IEmailSender, EmailSenderService>();
builder.Services.AddScoped<IRentService, RentService>();
builder.Services.AddSingleton<ApplicationLog>();
builder.Services.AddHttpClient<IUsersAPI, UsersAPI>((client) =>
{
    // Configuração do HttpClient
    client.BaseAddress = new Uri(Environment.GetEnvironmentVariable("AUTH_SERVICE_URL")); // URL base do serviço
    client.Timeout = TimeSpan.FromSeconds(30); // Timeout
})
.ConfigurePrimaryHttpMessageHandler(() => new HttpClientHandler())
.AddTypedClient<IUsersAPI>((httpClient, serviceProvider) =>
{
    // Configuração de informações do cliente HMAC
    var clientId = "service_imoveis";
    var secretKey = Environment.GetEnvironmentVariable("HMAC_KEY") ?? "default-secret-key";
    return new UsersAPI(httpClient, clientId, secretKey);
});


// Configura JWT settings
var jwtSettings = new JwtSettings
{
    SecretKey = Environment.GetEnvironmentVariable("JwtSettings__SecretKey"),
    ExpiryMinutes = int.Parse(Environment.GetEnvironmentVariable("JwtSettings__ExpiryMinutes")),
    Issuer = Environment.GetEnvironmentVariable("JwtSettings__Issuer"),
    Audience = Environment.GetEnvironmentVariable("JwtSettings__Audience")
};
builder.Services.AddSingleton(jwtSettings);

// Configura autenticação JWT
builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    options.SaveToken = true;
    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        ValidIssuer = jwtSettings.Issuer,
        ValidAudience = jwtSettings.Audience,
        IssuerSigningKey = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(jwtSettings.SecretKey))
    };
});

builder.Services.AddControllers();
builder.Services.AddSwaggerGen(c =>
{
    c.SwaggerDoc("v1", new OpenApiInfo { Title = "Serviço de Pagamento", Version = "v1" });

    c.AddSecurityDefinition("Bearer", new OpenApiSecurityScheme
    {
        In = ParameterLocation.Header,
        Description = "Please enter JWT with Bearer into field",
        Name = "Authorization",
        Type = SecuritySchemeType.ApiKey,
        Scheme = "Bearer"
    });

    c.AddSecurityRequirement(new OpenApiSecurityRequirement {
    {
        new OpenApiSecurityScheme {
            Reference = new OpenApiReference {
                Type = ReferenceType.SecurityScheme,
                Id = "Bearer"
            }
        },
        new string[] { }
    }});
});

// Configurar roles para o JWT

builder.Services.AddAuthorization(options =>
{
    options.AddPolicy(nameof(Roles.Admin), policy => policy.RequireRole(nameof(Roles.Admin)));
    options.AddPolicy(nameof(Roles.Locador), policy => policy.RequireRole(nameof(Roles.Locador)));
    options.AddPolicy(nameof(Roles.Locatario), policy => policy.RequireRole(nameof(Roles.Locatario)));
    options.AddPolicy(nameof(Roles.Judiciario), policy => policy.RequireRole(nameof(Roles.Judiciario)));
    options.AddPolicy("AllRoles", policy => policy.RequireRole(nameof(Roles.Admin), nameof(Roles.Locador), nameof(Roles.Locatario), nameof(Roles.Judiciario)));
    options.AddPolicy("LocadorORLocatario", policy => policy.RequireRole(nameof(Roles.Locador), nameof(Roles.Locatario)));
    options.AddPolicy("AdminORJudiciario", policy => policy.RequireRole(nameof(Roles.Admin), nameof(Roles.Judiciario)));
    options.AddPolicy("AdminORLocador", policy => policy.RequireRole(nameof(Roles.Admin), nameof(Roles.Locador)));
    options.AddPolicy("AdminORLocatario", policy => policy.RequireRole(nameof(Roles.Admin), nameof(Roles.Locatario)));
});


builder.Logging.ClearProviders();
builder.Logging.AddConsole();
builder.Logging.AddDebug();


// Configuração de CORS corrigida
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowSpecificOrigins",
        policy =>
        {
            policy.WithOrigins("*", "http://localhost:5173", "https://frontend-ajbn.onrender.com") // Substitua pelos domínios específicos que você deseja permitir
                  .AllowCredentials()
                  .AllowAnyHeader()
                  .AllowAnyMethod();
        });
});

var app = builder.Build();

// Configure the HTTP request pipeline.
if (app.Environment.IsDevelopment())
{
    app.UseDeveloperExceptionPage();
    app.UseSwagger();
    app.UseSwaggerUI(c =>
    {
        c.SwaggerEndpoint("/swagger/v1/swagger.json", "Serviço de Pagamento");
        c.RoutePrefix = string.Empty; 
    });
}
else
{
    app.UseExceptionHandler("/Home/Error");
    app.UseHsts();
}

if (env == "Development")
{
    app.UseHttpsRedirection();
}

if (env == "Development")
{
app.UseHttpsRedirection();
}

app.UseHttpsRedirection();
    
app.UseCors("AllowSpecificOrigins");
app.UseCors();
app.UseRouting();

app.UseAuthentication();
app.UseAuthorization();

app.MapControllerRoute(
    name: "default",
    pattern: "{controller=Home}/{action=Index}/{id?}");

app.Run();