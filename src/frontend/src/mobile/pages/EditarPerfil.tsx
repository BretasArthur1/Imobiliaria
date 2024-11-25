import { useState, useEffect } from "react";
import Navbar from "../components/Navbar/Navbar";
import Footer from "../../components/Footer/FooterSmall";
import Voltar from "../components/Voltar";
import FormField from "../components/Form/FormField";
import ModalConfirmacao from "../components/ModalConfirmacao";
import Botao from "../../components/Botoes/Botao";
import axiosInstance from "../../services/axiosConfig";
import getTokenData from "../../services/tokenConfig";
import { useNavigate } from "react-router-dom";

export default function EditarPerfil() {
  // Estado do formulário para armazenar dados do usuário
  const [resultMessage, setResultMessage] = useState("");
  const [userData, setUserData] = useState({
    nome: null,
    telefone: null,
    nacionalidade: null,
    cpf: null,
    rg: null,
    passaporte: null,
    endereço: null,
    CNPJ: null,
    email: null,
    dataCriacao: null,
  });

  // Hook para navegação
  const navigate = useNavigate();

  const [isModalVisible, setIsModalVisible] = useState(false);

  // Tipagem explícita para os parâmetros 'field' e 'value'
  const handleInputChange = (field: keyof typeof userData, value: string) => {
    setUserData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
  };

  const showModal = () => setIsModalVisible(true);

  const handleConfirm = async () => {
    setIsModalVisible(false);
    // console.log("Perfil salvo com sucesso:", userData);

    // {
//   "email": "string",
//   "cpf": "string",
//   "imovelId": 0,
//   "nacionalidade": "string",
//   "numeroTelefone": "string",
//   "nomeCompletoLocador": "string",
//   "cnpj": "string",
//   "endereco": "string",
//   "passaporte": "string",
//   "rg": "string"
// }

    // Integracao com o back para atualizar

    try{ 

      // Pegar info do jwt 
      const tokenInfo = getTokenData();

      if(!tokenInfo){
        console.log("Token não encontrado");
        return;
      }

      console.log(tokenInfo);

      // http://schemas.microsoft.com/ws/2008/06/identity/claims/role

      const role = tokenInfo["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];

      var responseUpdate: any;

      if(role == "Admin" || role == "Judiciario"){
        // {
        //   "usuarioId": 0,
        //   "nomeCompleto": "string",
        //   "tipoColaborador": "string"
        // }

        responseUpdate = await axiosInstance.put(`auth/Colaborador/AtualizarColaborador`, {
          nomeCompleto: userData.nome,
          tipoColaborador: role,
        });

      } else if(role == "Locador"){
         responseUpdate = await axiosInstance.post(`auth/Locador/AtualizarLocador`, {
          email: userData.email,
          cpf: userData.cpf,
          nacionalidade: userData.nacionalidade,
          numeroTelefone: userData.telefone,
          nomeCompletoLocador: userData.nome,
          cnpj: userData.CNPJ,
          endereco: userData.endereço,
          passaporte: userData.passaporte,
          rg: userData.rg,
        });
      } else if(role == "Locatario"){
        responseUpdate = await axiosInstance.post(`auth/Locatario/AtualizarLocatario`, {
          email: userData.email,
          cpf: userData.cpf,
          nacionalidade: userData.nacionalidade,
          numeroTelefone: userData.telefone,
          nomeCompletoLocatario: userData.nome,
          cnpj: userData.CNPJ,
          endereco: userData.endereço,
          passaporte: userData.passaporte,
          rg: userData.rg,
        });
      }


      if (responseUpdate && responseUpdate.status === 200) {
        setResultMessage("Perfil atualizado com sucesso");
        console.log("Perfil atualizado com sucesso");
        navigate("/perfil");
      } else{
        setResultMessage("Erro ao atualizar o perfil");
        console.log("Erro ao atualizar o perfil");
      }


    } catch(erro: any){
      console.log(erro);
    }


  };

  const handleCancel = () => setIsModalVisible(false);

  const getUser = async () => {
    try{
        const response = await axiosInstance.get(`auth/Account/WhoAmI`);
        console.log(response.data);

        // Alterar os valores dos campos com os dados do usuário

        const UserInfo = response.data;

        if(UserInfo.role == "Admin" || UserInfo.role == "Judiciario"){
            setUserData({
            nome: UserInfo.nome,
            telefone: null,
            nacionalidade: UserInfo.national,
            cpf: null,
            rg: null,
            passaporte: null,
            endereço: null,
            CNPJ: null,
            email: UserInfo.email,
            dataCriacao: new Date(UserInfo.dataCriacao).toLocaleDateString('pt-BR'), // formatar para dd/mm/yyyy
            });
          } else{
            setUserData({
              nome: UserInfo.nome,
              telefone: UserInfo.telefone,
              nacionalidade: UserInfo.nacionalidade,
              cpf: UserInfo.cpf,
              rg: UserInfo.rg,
              passaporte: UserInfo.passaporte,
              endereço: UserInfo.endereco,
              CNPJ: UserInfo.cnpj,
              email: UserInfo.email,
              dataCriacao: new Date(UserInfo.dataCriacao).toLocaleDateString('pt-BR'),
            })
          }



    } catch(erro: any){
        console.log(erro.response?.data?.message || "Erro ao buscar o usuário");
    }
  }

  useEffect(() => {
    getUser();
  }, []);
  

  return (
    <main className="main-custom">
      <Navbar />
      <section className="section-custom">
        <Voltar />
        <h1>Editar Perfil</h1>

        <form className="flex flex-col gap-4 mb-4">
          <FormField
            label="Nome"
            initialValue={userData.nome}
            onChange={(value) => handleInputChange("nome", value)}
          />
          <FormField
            label="Telefone"
            initialValue={userData.telefone}
            onChange={(value) => handleInputChange("telefone", value)}
          />
          <FormField
            label="Nacionalidade"
            initialValue={userData.nacionalidade}
            onChange={(value) => handleInputChange("nacionalidade", value)}
          />
          <FormField
            label="CPF"
            initialValue={userData.cpf}
            onChange={(value) => handleInputChange("cpf", value)}
          />
          <FormField
            label="RG"
            initialValue={userData.rg}
            onChange={(value) => handleInputChange("rg", value)}
          />
          <FormField
            label="Passaporte"
            initialValue={userData.passaporte}
            onChange={(value) => handleInputChange("passaporte", value)}
          />
          <FormField
            label="Endereço"
            initialValue={userData.endereço}
            onChange={(value) => handleInputChange("Endereço", value)}
          />
          <FormField
            label="CNPJ"
            initialValue={userData.CNPJ}
            onChange={(value) => handleInputChange("CNPJ", value)}
          />
        </form>

        {resultMessage && <p className="text-black-500 mt-4">{resultMessage}</p>}
        <Botao label="Salvar" onClick={showModal} />
      </section>

      <Footer />

      {isModalVisible && (
        <ModalConfirmacao
          mensagem="Tem certeza de que deseja salvar as alterações no perfil?"
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </main>
  );
}
