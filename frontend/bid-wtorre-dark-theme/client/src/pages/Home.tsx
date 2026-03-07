import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";

/**
 * BID WTORRE - Dark Theme Professional Preview
 *
 * This page showcases the complete dark theme with all components,
 * colors, typography, and interactive elements.
 */

function DarkThemePreview() {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  return (
    <div className="min-h-screen bg-[#0f172a] text-[#f1f5f9]">
      {/* ========== SIDEBAR ========== */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-20 w-72 bg-[#1a1f35] border-r border-[#334155] flex flex-col shadow-lg transition-transform duration-300 ${!sidebarOpen ? "-translate-x-full" : ""} lg:translate-x-0`}
      >
        {/* Sidebar Header */}
        <div className="h-16 flex items-center justify-between px-6 bg-gradient-to-r from-[#6366f1] to-[#4f46e5] flex-shrink-0">
          <h1 className="text-white font-bold text-lg flex items-center gap-2">
            <div className="w-6 h-6 bg-white/20 rounded-md flex items-center justify-center">
              BW
            </div>
            BID WTORRE
          </h1>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-2 rounded-md text-white/90 hover:bg-white/10 transition-colors"
          >
            <span className="text-xl">×</span>
          </button>
        </div>

        {/* Balance Card */}
        <div className="p-4 m-3 bg-[#232d45] border border-[#334155] rounded-lg shadow-md">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#94a3b8] font-semibold">
                Saldo Disponível
              </span>
              <span className="font-black text-[#10b981]">
                101 <span className="text-[9px] text-[#64748b]">pts</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#94a3b8] font-semibold">Em Jogo</span>
              <span className="font-black text-[#f59e0b]">
                50 <span className="text-[9px] text-[#64748b]">pts</span>
              </span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-[#94a3b8] font-semibold">
                Lances Ativos
              </span>
              <span className="font-black text-[#6366f1]">1</span>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1 overflow-y-auto">
          <p className="px-3 text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">
            Principal
          </p>

          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#f1f5f9] rounded-md hover:bg-[#232d45] transition-colors bg-[rgba(99,102,241,0.15)] border-l-3 border-[#6366f1]"
          >
            <span className="mr-3">🏠</span> Início
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">👤</span> Meu Perfil
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">🎫</span> Meus Bids
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">📜</span> Histórico
          </a>

          <div className="my-4 border-t border-[#334155]"></div>
          <p className="px-3 text-xs font-bold text-[#64748b] uppercase tracking-wider mb-3">
            Administração
          </p>

          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">👥</span> Gerenciar Usuários
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">🏢</span> Gerenciar Grupos
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">🎫</span> Gerenciar Bids
          </a>
          <a
            href="#"
            className="flex items-center px-3 py-2.5 text-sm font-medium text-[#cbd5e1] rounded-md hover:bg-[#232d45] transition-colors"
          >
            <span className="mr-3">⚙️</span> Configurações
          </a>
        </nav>

        {/* Logout Button */}
        <div className="p-4 border-t border-[#334155] bg-[#232d45] flex flex-col gap-2">
          <button className="flex items-center justify-center w-full px-3 py-2 text-sm font-bold text-[#ef4444] bg-[#1a1f35] border border-[#7f1d1d] hover:bg-[rgba(239,68,68,0.1)] rounded-lg transition-colors">
            <span className="mr-2">🚪</span> Sair do Sistema
          </button>
        </div>
      </aside>

      {/* ========== MAIN CONTENT ========== */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="h-16 bg-[#1e293b] border-b border-[#334155] flex items-center justify-between gap-4 px-6 shadow-md z-10">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden flex-shrink-0 p-2 rounded-md text-[#cbd5e1] hover:bg-[#334155] transition-colors"
            >
              <span className="text-xl">☰</span>
            </button>
            <h2 className="text-lg lg:text-xl font-semibold text-[#f1f5f9]">
              Dashboard
            </h2>
          </div>

          <div className="flex items-center gap-4 flex-shrink-0">
            <button className="p-2 rounded-md text-[#cbd5e1] hover:bg-[#334155] transition-colors relative">
              <span className="text-xl">🔔</span>
              <span className="absolute top-1 right-1 w-2 h-2 bg-[#ef4444] rounded-full"></span>
            </button>
            <div className="flex items-center gap-3 group hover:bg-[#334155] px-3 py-1.5 rounded-lg transition-all cursor-pointer">
              <div className="text-right hidden md:block">
                <p className="text-sm font-bold text-[#f1f5f9]">
                  Administrador
                </p>
                <p className="text-[10px] text-[#818cf8] font-bold uppercase tracking-wider">
                  Ver Perfil
                </p>
              </div>
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-[#6366f1] to-[#4f46e5] flex items-center justify-center text-white font-bold border border-[#818cf8]">
                AD
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-[#0f172a] p-6">
          <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#94a3b8] text-sm font-medium mb-1">
                      Saldo Disponível
                    </p>
                    <p className="text-3xl font-bold text-[#10b981]">101 pts</p>
                  </div>
                  <div className="w-12 h-12 bg-[rgba(16,185,129,0.1)] rounded-lg flex items-center justify-center text-2xl">
                    ✓
                  </div>
                </div>
              </div>

              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#94a3b8] text-sm font-medium mb-1">
                      Em Jogo
                    </p>
                    <p className="text-3xl font-bold text-[#f59e0b]">50 pts</p>
                  </div>
                  <div className="w-12 h-12 bg-[rgba(245,158,11,0.1)] rounded-lg flex items-center justify-center text-2xl">
                    ⚠
                  </div>
                </div>
              </div>

              <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#94a3b8] text-sm font-medium mb-1">
                      Lances Ativos
                    </p>
                    <p className="text-3xl font-bold text-[#6366f1]">1</p>
                  </div>
                  <div className="w-12 h-12 bg-[rgba(99,102,241,0.1)] rounded-lg flex items-center justify-center text-2xl">
                    🎫
                  </div>
                </div>
              </div>
            </div>

            {/* Color Palette Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Paleta de Cores
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="w-full h-24 bg-[#6366f1] rounded-lg shadow-md"></div>
                  <p className="text-sm font-medium text-[#f1f5f9]">Primária</p>
                  <p className="text-xs text-[#94a3b8]">#6366f1</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-24 bg-[#10b981] rounded-lg shadow-md"></div>
                  <p className="text-sm font-medium text-[#f1f5f9]">Sucesso</p>
                  <p className="text-xs text-[#94a3b8]">#10b981</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-24 bg-[#f59e0b] rounded-lg shadow-md"></div>
                  <p className="text-sm font-medium text-[#f1f5f9]">Aviso</p>
                  <p className="text-xs text-[#94a3b8]">#f59e0b</p>
                </div>
                <div className="space-y-2">
                  <div className="w-full h-24 bg-[#ef4444] rounded-lg shadow-md"></div>
                  <p className="text-sm font-medium text-[#f1f5f9]">Perigo</p>
                  <p className="text-xs text-[#94a3b8]">#ef4444</p>
                </div>
              </div>
            </div>

            {/* Buttons Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Componentes de Botão
              </h3>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-[#94a3b8] mb-2">
                    Botões Primários
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-4 py-2 bg-[#6366f1] text-white rounded-md font-medium hover:bg-[#4f46e5] transition-colors shadow-md">
                      Primário
                    </button>
                    <button className="px-4 py-2 bg-[#10b981] text-white rounded-md font-medium hover:bg-[#059669] transition-colors shadow-md">
                      Sucesso
                    </button>
                    <button className="px-4 py-2 bg-[#f59e0b] text-white rounded-md font-medium hover:bg-[#d97706] transition-colors shadow-md">
                      Aviso
                    </button>
                    <button className="px-4 py-2 bg-[#ef4444] text-white rounded-md font-medium hover:bg-[#dc2626] transition-colors shadow-md">
                      Perigo
                    </button>
                  </div>
                </div>

                <div>
                  <p className="text-sm text-[#94a3b8] mb-2">
                    Botões Secundários
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button className="px-4 py-2 bg-[#334155] text-[#f1f5f9] rounded-md font-medium hover:bg-[#475569] transition-colors border border-[#475569]">
                      Secundário
                    </button>
                    <button className="px-4 py-2 bg-transparent text-[#6366f1] rounded-md font-medium hover:bg-[rgba(99,102,241,0.1)] transition-colors border border-[#6366f1]">
                      Outline
                    </button>
                    <button
                      className="px-4 py-2 bg-[#334155] text-[#f1f5f9] rounded-md font-medium opacity-50 cursor-not-allowed"
                      disabled
                    >
                      Desabilitado
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Badges Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Badges e Labels
              </h3>
              <div className="flex flex-wrap gap-2">
                <span className="bg-[rgba(99,102,241,0.2)] text-[#818cf8] px-3 py-1 rounded-full text-xs font-semibold">
                  Primária
                </span>
                <span className="bg-[rgba(16,185,129,0.2)] text-[#10b981] px-3 py-1 rounded-full text-xs font-semibold">
                  Sucesso
                </span>
                <span className="bg-[rgba(245,158,11,0.2)] text-[#f59e0b] px-3 py-1 rounded-full text-xs font-semibold">
                  Aviso
                </span>
                <span className="bg-[rgba(239,68,68,0.2)] text-[#ef4444] px-3 py-1 rounded-full text-xs font-semibold">
                  Perigo
                </span>
                <span className="bg-[rgba(59,130,246,0.2)] text-[#3b82f6] px-3 py-1 rounded-full text-xs font-semibold">
                  Info
                </span>
              </div>
            </div>

            {/* Alerts Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Alertas e Notificações
              </h3>
              <div className="space-y-3">
                <div className="flex items-start gap-3 p-4 bg-[rgba(16,185,129,0.1)] border-l-4 border-[#10b981] rounded-md">
                  <span className="text-2xl flex-shrink-0 mt-0.5">✓</span>
                  <div>
                    <p className="font-semibold text-[#f1f5f9]">Sucesso!</p>
                    <p className="text-sm text-[#cbd5e1]">
                      Sua ação foi concluída com sucesso.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[rgba(245,158,11,0.1)] border-l-4 border-[#f59e0b] rounded-md">
                  <span className="text-2xl flex-shrink-0 mt-0.5">⚠</span>
                  <div>
                    <p className="font-semibold text-[#f1f5f9]">Aviso</p>
                    <p className="text-sm text-[#cbd5e1]">
                      Verifique os dados antes de prosseguir.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[rgba(239,68,68,0.1)] border-l-4 border-[#ef4444] rounded-md">
                  <span className="text-2xl flex-shrink-0 mt-0.5">⚠</span>
                  <div>
                    <p className="font-semibold text-[#f1f5f9]">Erro</p>
                    <p className="text-sm text-[#cbd5e1]">
                      Ocorreu um erro ao processar sua solicitação.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3 p-4 bg-[rgba(59,130,246,0.1)] border-l-4 border-[#3b82f6] rounded-md">
                  <span className="text-2xl flex-shrink-0 mt-0.5">ℹ</span>
                  <div>
                    <p className="font-semibold text-[#f1f5f9]">Informação</p>
                    <p className="text-sm text-[#cbd5e1]">
                      Esta é uma mensagem informativa.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Form Elements Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Elementos de Formulário
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#f1f5f9] mb-2">
                    Input de Texto
                  </label>
                  <input
                    type="text"
                    placeholder="Digite algo..."
                    className="w-full px-4 py-2 bg-[#334155] text-[#f1f5f9] border border-[#475569] rounded-md focus:outline-none focus:border-[#6366f1] focus:ring-2 focus:ring-[rgba(99,102,241,0.1)]"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f1f5f9] mb-2">
                    Select
                  </label>
                  <select className="w-full px-4 py-2 bg-[#334155] text-[#f1f5f9] border border-[#475569] rounded-md focus:outline-none focus:border-[#6366f1]">
                    <option>Opção 1</option>
                    <option>Opção 2</option>
                    <option>Opção 3</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-[#f1f5f9] mb-2">
                    Textarea
                  </label>
                  <textarea
                    placeholder="Digite uma mensagem..."
                    className="w-full px-4 py-2 bg-[#334155] text-[#f1f5f9] border border-[#475569] rounded-md focus:outline-none focus:border-[#6366f1] resize-none"
                    rows={4}
                  ></textarea>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="checkbox"
                    className="w-4 h-4 rounded"
                  />
                  <label htmlFor="checkbox" className="text-sm text-[#cbd5e1]">
                    Concordo com os termos
                  </label>
                </div>
              </div>
            </div>

            {/* Table Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Tabela de Exemplo
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#334155]">
                      <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                        ID
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                        Evento
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                        Status
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                        Data
                      </th>
                      <th className="text-left py-3 px-4 font-semibold text-[#f1f5f9]">
                        Ação
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b border-[#334155] hover:bg-[#232d45] transition-colors">
                      <td className="py-3 px-4 text-[#cbd5e1]">#001</td>
                      <td className="py-3 px-4 text-[#cbd5e1]">
                        Luan Santana - AZP
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-[rgba(16,185,129,0.2)] text-[#10b981] px-2 py-1 rounded text-xs font-semibold">
                          Aberto
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#cbd5e1]">24/03/2026</td>
                      <td className="py-3 px-4">
                        <button className="text-[#6366f1] hover:text-[#818cf8] font-medium">
                          Editar
                        </button>
                      </td>
                    </tr>
                    <tr className="border-b border-[#334155] hover:bg-[#232d45] transition-colors">
                      <td className="py-3 px-4 text-[#cbd5e1]">#002</td>
                      <td className="py-3 px-4 text-[#cbd5e1]">
                        Teste - Allianz
                      </td>
                      <td className="py-3 px-4">
                        <span className="bg-[rgba(107,114,128,0.2)] text-[#9ca3af] px-2 py-1 rounded text-xs font-semibold">
                          Encerrado
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#cbd5e1]">24/03/2026</td>
                      <td className="py-3 px-4">
                        <button className="text-[#6366f1] hover:text-[#818cf8] font-medium">
                          Editar
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Typography Section */}
            <div className="bg-[#1e293b] border border-[#334155] rounded-lg p-6">
              <h3 className="text-xl font-bold text-[#f1f5f9] mb-4">
                Tipografia
              </h3>
              <div className="space-y-4">
                <div>
                  <h1 className="text-4xl font-bold text-[#f1f5f9]">
                    Heading 1 - 36px
                  </h1>
                  <p className="text-sm text-[#94a3b8] mt-1">
                    Bold, para títulos principais
                  </p>
                </div>
                <div>
                  <h2 className="text-3xl font-bold text-[#f1f5f9]">
                    Heading 2 - 30px
                  </h2>
                  <p className="text-sm text-[#94a3b8] mt-1">
                    Bold, para subtítulos
                  </p>
                </div>
                <div>
                  <p className="text-base text-[#f1f5f9]">
                    Parágrafo Regular - 16px
                  </p>
                  <p className="text-sm text-[#94a3b8] mt-1">
                    Texto secundário para descrições
                  </p>
                </div>
                <div>
                  <p className="text-sm text-[#94a3b8]">Texto Pequeno - 14px</p>
                  <p className="text-xs text-[#64748b] mt-1">
                    Para labels e informações adicionais
                  </p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

export default DarkThemePreview;
