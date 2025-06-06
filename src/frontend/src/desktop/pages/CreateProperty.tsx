import { useState, useEffect } from "react";
import FormField from "../components/Form/FormField";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/FooterSmall";
import Loading from "../../components/Loading";
import { showSuccessToast, showErrorToast } from "../../utils/toastMessage";
import axiosInstance from "../../services/axiosConfig.ts";
import axios from "axios";

export default function CreateProperty() {
  const [propertyType, setPropertyType] = useState("Kitnet");
  const [cep, setCep] = useState("");
  const [address, setAddress] = useState("");
  const [complement, setComplement] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [rent, setRent] = useState("");
  const [condoFee, setCondoFee] = useState("");
  const [description, setDescription] = useState("");
  const [locadores, setLocadores] = useState([]); // Lista de locadores
  const [locatarios, setLocatarios] = useState([]); // Lista de locatários
  const [selectedLocadorId, setSelectedLocadorId] = useState<string | null>(null);
  const [selectedLocatarioId, setSelectedLocatarioId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [photos, setPhotos] = useState<File[]>([]); // Estado para armazenar as fotos

  const fetchSelectOptions = async () => {
    try {
      const [lessorResponse, renterResponse] = await Promise.all([
        axiosInstance.get("auth/Locador/PegarTodosLocadores"),
        axiosInstance.get("auth/Locatario/PegarTodosLocatarios"),
      ]);

      // Extract the actual arrays from the API response structure
      const lessorsData = lessorResponse.data?.$values || [];
      const rentersData = renterResponse.data?.$values || [];

      // console.log('Lessors raw data:', JSON.stringify(lessorResponse.data, null, 2));
      // console.log('First lessor example:', JSON.stringify(lessorsData[0], null, 2));
      // console.log('Renters raw data:', JSON.stringify(renterResponse.data, null, 2));
      // console.log('First renter example:', JSON.stringify(rentersData[0], null, 2));

      setLocadores(lessorsData);
      setLocatarios(rentersData);
    } catch (error) {
      console.error("Erro ao buscar opções:", error);
      setLocadores([]);
      setLocatarios([]);
      showErrorToast("Erro ao carregar dados. Tente novamente.");
    }
  };

  useEffect(() => {
    fetchSelectOptions();
  }, []);
  
    // Função para lidar com o upload das fotos
    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const filesArray = Array.from(e.target.files); // Converter para array
        // console.log("Arquivos selecionados:", filesArray); // Log para verificar os arquivos
        setPhotos(filesArray); // Atualize o estado
      }
    };
  
    const validateFields = () => {
      const missingFields = [];
    
      if (!propertyType) missingFields.push("Tipo de imóvel");
      if (!cep) missingFields.push("CEP");
      if (!address) missingFields.push("Endereço");
      if (!neighborhood) missingFields.push("Bairro");
    
      if (missingFields.length > 0) {
        const message = `Por favor, preencha os seguintes campos obrigatórios: ${missingFields.join(", ")}.`;
        showErrorToast(message);
        return false; // Indica que a validação falhou
      }
    
      return true; // Indica que a validação foi bem-sucedida
    };
  
  // Função de envio do formulário
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
  
    try {
      // Verificar campos obrigatórios
      if (!validateFields()) {
        return;
      }
  
      const formData = new FormData();
      formData.append("TipoImovel", propertyType);
      formData.append("Cep", cep);
      formData.append("Condominio", condoFee);
      formData.append("ValorImovel", rent);
      formData.append("Bairro", neighborhood);
      formData.append("Descricao", description);
      formData.append("Endereco", address);
      formData.append("Complemento", complement);
      formData.append("LocadorId", selectedLocadorId || "");
      formData.append("LocatarioId", selectedLocatarioId || "");
  
      // Adicionar as fotos
      photos.forEach((photo) => formData.append("files", photo));
  
      // Log detalhado
      // console.log("Verificar FormData:");
      // formData.forEach((value, key) => {
      //   console.log(key, value);
      // });
  
      const response = await axiosInstance.post("property/Imoveis/CriarImovelComFoto", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });
  
      showSuccessToast(response?.data?.message || "Imóvel criado com sucesso!");
  
      // Limpar formulário após o envio
      setPropertyType("Kitnet");
      setCep("");
      setAddress("");
      setComplement("");
      setNeighborhood("");
      setRent("");
      setCondoFee("");
      setDescription("");
      setSelectedLocadorId(null);
      setSelectedLocatarioId(null);
      setPhotos([]); // Limpar fotos após o envio
  
    } catch (error: any) {
      console.error("Erro ao criar imóvel:", error);
  
      if (axios.isAxiosError(error)) {
        // Erro com resposta do servidor (ex: 400, 500)
        if (error.response) {
          const errorPayload = error.response.data; // Captura o payload de resposta
          showErrorToast(errorPayload)
  
          // Log detalhado do payload de erro
          console.error("Payload de erro:", errorPayload);
        }
        // Erro de rede (ex: servidor indisponível)
        else if (error.request) {
          showErrorToast("Erro de rede. Verifique sua conexão e tente novamente.");
        }
        // Erro inesperado
        else {
          showErrorToast("Ocorreu um erro inesperado. Tente novamente mais tarde.");
        }
      }
      // Erro genérico (não relacionado ao Axios)
      else if (error instanceof Error) {
        showErrorToast(error.message);
      }
      // Erro desconhecido
      else {
        showErrorToast("Erro ao se conectar com o servidor.");
      }
    } finally {
      setLoading(false);
    }
  };
  

  return (
    <div>
      <Navbar />
      <div className="mx-10 mt-10">
      <h1 className="text-3xl font-bold text-yellow-darker mb-6">Adicionar Imóvel</h1>
      <div className="min-h-screen flex flex-col items-center justify-center">
        <div className="w-full max-w-xl py-6 bg-white rounded-lg">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-neutral-600">Tipo do Imóvel</label>
              <select
                value={propertyType}
                onChange={(e) => setPropertyType(e.target.value)}
                className="h-10 w-full bg-transparent border border-neutral-200 px-2 rounded"
              >
                <option>Kitnet</option>
                <option>Apartamento</option>
                <option>Casa</option>
                <option>Comercial</option>
              </select>
            </div>

            {/* Campos obrigatórios */}
            <FormField label="CEP" placeholder="Digite o CEP" value={cep} onChange={(e) => setCep(e.target.value)} />
            <FormField label="Endereço" placeholder="Digite o endereço" value={address} onChange={(e) => setAddress(e.target.value)} />
            <FormField label="Bairro" placeholder="Bairro do imóvel" value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} />
            <FormField label="Aluguel (R$)" value={rent} onChange={(e) => setRent(e.target.value)} />

            {/* Campos opcionais */}
            <FormField
              label={
                <div className="flex justify-between items-center">
                  <span>Complemento <span className="text-sm text-neutral-500">(Opcional)</span></span>
                  
                </div>
              }
              placeholder="Digite o complemento"
              value={complement}
              onChange={(e) => setComplement(e.target.value)}
            />
            <FormField
              label={
                <div className="flex justify-between items-center">
                  <span>Condomínio (R$) <span className="text-sm text-neutral-500">(Opcional)</span></span>
                  
                </div>
              }
              value={condoFee}
              onChange={(e) => setCondoFee(e.target.value)}
            />

            <div>
              <label className="block text-neutral-600">Locador</label>
              <select
                value={selectedLocadorId || ""}
                onChange={(e) => setSelectedLocadorId(e.target.value)}
                className="h-10 w-full bg-transparent border border-neutral-200 px-2 rounded"
              >
                <option value="">Selecione um locador</option>
                {locadores.map((locador: any) => (
                  <option key={locador.locadorId} value={locador.locadorId}>
                    {locador.nomeCompletoLocador}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-600">
                Locatário <span className="text-sm text-neutral-500">(Opcional)</span>
              </label>
              <select
                value={selectedLocatarioId || ""}
                onChange={(e) => setSelectedLocatarioId(e.target.value)}
                className="h-10 w-full bg-transparent border border-neutral-200 px-2 rounded"
              >
                <option value="">Selecione um locatário</option>
                {locatarios.map((locatario: any) => (
                  <option key={locatario.locatarioId} value={locatario.locatarioId}>
                    {locatario.nomeCompletoLocatario}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-neutral-600">
                Fotos do Imóvel <span className="text-sm text-neutral-500">(Opcional)</span>
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                multiple
                className="h-10 w-full bg-transparent border border-neutral-200 px-2 rounded"
              />
            </div>

            <div>
              <label className="block text-neutral-600 font-medium">
                Descrição <span className="text-sm text-neutral-500">(Opcional)</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="mt-1 block w-full border border-neutral-200 px-2 py-2 text-form-label rounded-md shadow-sm focus:border-brown-500 focus:ring-brown-500"
                rows={3}
              ></textarea>
            </div>

            <button
              type="submit"
              className="w-full py-2 px-4 bg-yellow-darker text-white rounded-md hover:bg-yellow-dark transition duration-300 focus:outline-none focus:bg-yellow-dark mt-4"
              disabled={loading}
            >
              {loading ? "Enviando..." : "Adicionar Imóvel"}
            </button>
          </form>
        </div>
      </div>
    </div>

      {loading && <Loading type="spinner" />}
      <Footer />
    </div>
  );
}
