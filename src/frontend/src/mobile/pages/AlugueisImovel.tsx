// Adicionar a página de Aluguéis na Navbar 
// Arrumar filtro de alugueis (está só pelo mês)

// Modified version of ChamadosImovel to display Pagamentos
import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
import Navbar from "../../components/Navbar/Navbar";
import Footer from "../../components/Footer/FooterSmall";
import Card from "../components/Alugueis/CardAluguel";
import FormFieldFilter from "../components/Form/FormFieldFilter";
import FilterIcon from "/Filter.svg";
import Voltar from "../../components/Botoes/Voltar";
import Loading from "../../components/Loading";
import { showErrorToast } from "../../utils/toastMessage";
import axiosInstance from "../../services/axiosConfig";

// import { useNavigate } from "react-router-dom";
import { useAtomValue } from "jotai";
import { userRoleAtom } from "../../store/atoms";
import NavigationButtons, { UserRole } from "../../components/Navigation/NavigationButtons";

// Exporta a página de Alugueis relacionados a um Imóvel
export default function AlugueisImovel() {
  // const navigate = useNavigate();
  const userRole = useAtomValue(userRoleAtom);
  interface Aluguel {
    aluguelId: number;
    contratoId: number;
    pagamentoId: number;
    status: boolean;
    mes: string;
    boleto_doc: string;
  }

  const [alugueis, setAlugueis] = useState<Aluguel[]>([]);
  const [filteredData, setFilteredData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true); 

  // Buscar os dados 
  const fetchAlugueis = async () => {
    try {
      const response = await axiosInstance.get(
        "payment/Rent/PegarTodosAlugueis"
      );

      if (!response.data) {
        console.error("Dados de resposta inválidos");
        return;
      }

      const alugueisData = response.data;

      // Trata as informações retornadas do back-end
      const mappedData = alugueisData.map((aluguel: Aluguel) => ({
        aluguelId: aluguel.aluguelId,
        contratoId: aluguel.contratoId,
        title: "Aluguel n° " + aluguel.aluguelId || "Aluguel não encontrado",
        line1: aluguel.contratoId || "Contrato não encontrado",
        line2: aluguel.mes || "Mês do aluguel não encontrado",
        line3: aluguel.status
          ? "Realizado"
          : "Em Aberto",
        status: aluguel.status
          ? "Pago"
          : "Em aberto",
      }));

      setAlugueis(mappedData);
      setFilteredData(mappedData);
    } catch (error: any) {
      console.error(error);
      showErrorToast("Erro ao se conectar com o servidor.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAlugueis();
  }, []);

  return (
    <main className="flex flex-col min-h-screen bg-[#F0F0F0]">
      <Navbar />

      <NavigationButtons userRole={userRole as UserRole}/>

      {/* Botão de Voltar, Título da página e Filtro */}
      <div className="h-[1px] bg-neutral-400 mb-4"></div>
      <div className="flex-grow w-full flex justify-center">
        <section className="flex flex-col gap-y-5 bg-[#F0F0F0] max-w-6xl flex-grow p-6 rounded-lg ">
          <Voltar />
          <h2 className="text-2xl font-semibold mb-4">Aluguéis</h2>

          <form className="grid grid-cols-1 gap-4 mb-6 ">
            <div className="flex w-full gap-2 items-end">
              <div className="w-full">
                <FormFieldFilter
                  label="Buscar aluguel"
                  onFilter={(searchTerm) => {
                    const filtered = alugueis.filter((aluguel) =>
                      aluguel.mes
                        .toLowerCase()
                        .includes(searchTerm.toLowerCase())
                    );
                    setFilteredData(filtered);
                  }}
                />
              </div>
              <button
                type="submit"
                className="flex items-center justify-center gap-2 w-1/4 h-10 px-4 bg-[#1F1E1C] text-neutral-50 rounded-md hover:bg-black transition duration-200"
              >
                Filtrar
                <img src={FilterIcon} alt="Filtrar" className="w-5 h-5" />
              </button>
            </div>
          </form>

          {/* Retorna os resultados da pesquisa de filtro */}
          {loading ? (
            <Loading type="skeleton" />
          ) : (
            <section className="flex-grow flex flex-col gap-y-5 bg-[#F0F0F0]">
              <h2 className="text-2xl font-semibold">Resultados</h2>
              <div className="h-[1px] bg-neutral-300 mb-4"></div>
              {filteredData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredData.map((aluguel) => (
                    <Card
                      key={aluguel.aluguelId}
                      aluguelId={aluguel.aluguelId}
                      title={aluguel.title}
                      line1={aluguel.line1}
                      line2={aluguel.line2}
                      line3={aluguel.line3}
                      status={aluguel.status}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-center text-lg text-neutral-500 mt-8 font-bold">
                  Nenhum aluguel encontrado.
                </p>
              )}
            </section>
          )}
        </section>
      </div>

      <Footer />
    </main>
  );
}