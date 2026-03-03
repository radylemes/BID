import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import { SettingsService } from '../../services/settings.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';
import { environment } from '../../../environments/environment';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Component({
  selector: 'app-user-list',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-list.component.html',
})
export class UserListComponent implements OnInit {
  users: any[] = [];
  filteredUsers: any[] = [];
  searchTerm: string = '';

  // Variáveis para as Listas de Organograma e Lógica de Negócio
  gruposDisponiveis: any[] = []; // Empresas e Setores (AD)
  gruposApostas: any[] = []; // Grupos de Lances/Eventos

  loading = false;
  apiUrl = environment.apiUri.replace('/api', '');

  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private settingsService: SettingsService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.carregarListaDeGrupos();
    this.carregarGruposApostas();
  }

  // Busca Empresas e Setores (organograma para modais Atribuir Grupo / Pontos em Lote)
  carregarListaDeGrupos() {
    this.groupService.getEmpresasComSetores().subscribe({
      next: (data) => {
        this.gruposDisponiveis = data;
      },
      error: () => console.error('Erro ao carregar lista de empresas/setores'),
    });
  }

  // Busca os Grupos de Apostas Manuais
  carregarGruposApostas() {
    this.userService.getGruposApostas().subscribe({
      next: (data) => (this.gruposApostas = data),
      error: () => console.error('Erro ao carregar grupos de apostas'),
    });
  }

  carregarDados() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data: any[]) => {
        this.users = data.map((u) => ({
          ...u,
          foto: u.foto || u.Foto || u.FOTO || null,
          empresa: u.empresa || u.Empresa || 'Geral',
          setor: u.setor || u.Setor || 'Geral',
          empresa_id: u.empresa_id || null,
          setor_id: u.setor_id || null,
          grupo_id: u.grupo_id || null,
          grupo_nome: u.grupo_nome || 'Sem Grupo',
          nome_completo: u.nome_completo,
          email: u.email,
          ativo: u.ativo == 1 || u.ativo == true,
          perfil: u.perfil || 'USER',
          pontos: u.pontos || 0,
        }));
        this.filteredUsers = [...this.users];
        this.loading = false;
        this.cd.detectChanges();
      },
      error: (err) => {
        console.error('Erro ao carregar usuários:', err);
        this.loading = false;
      },
    });
  }

  filtrar() {
    const term = this.searchTerm.toLowerCase();
    this.filteredUsers = this.users.filter(
      (u) =>
        u.nome_completo?.toLowerCase().includes(term) ||
        u.email?.toLowerCase().includes(term) ||
        u.setor?.toLowerCase().includes(term) ||
        u.empresa?.toLowerCase().includes(term) ||
        u.grupo_nome?.toLowerCase().includes(term),
    );
  }

  private getAdminId(): number {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.id || 1;
  }

  async alterarPerfil(user: any, event: any) {
    const novoPerfil = event.target.value;
    const perfilAntigo = user.perfil;

    const { value: motivo } = await Swal.fire({
      title: 'Alterar Perfil',
      text: `Mudar de ${perfilAntigo} para ${novoPerfil}?`,
      input: 'text',
      inputPlaceholder: 'Motivo da alteração...',
      showCancelButton: true,
      inputValidator: (value) => (!value ? 'Obrigatório!' : null),
    });

    if (motivo) {
      this.userService
        .mudarPerfil(user.id, { perfil: novoPerfil, adminId: this.getAdminId() })
        .subscribe({
          next: () => {
            user.perfil = novoPerfil;
            Swal.fire('Sucesso', 'Perfil atualizado.', 'success');
          },
          error: () => {
            event.target.value = perfilAntigo;
            Swal.fire('Erro', 'Falha ao atualizar perfil.', 'error');
          },
        });
    } else {
      event.target.value = perfilAntigo;
    }
  }

  async toggleStatus(user: any) {
    const novoStatus = !user.ativo;
    const { value: motivo } = await Swal.fire({
      title: 'Justificativa de Status',
      input: 'text',
      showCancelButton: true,
      inputValidator: (value) => (!value ? 'Obrigatório!' : null),
    });

    if (motivo) {
      this.userService
        .toggleStatus(user.id, { ativo: novoStatus, adminId: this.getAdminId() })
        .subscribe(() => {
          user.ativo = novoStatus;
          this.cd.detectChanges();
        });
    }
  }

  async editarPontos(user: any) {
    const { value: novosPontos } = await Swal.fire({
      title: 'Ajustar Pontos',
      input: 'number',
      inputValue: user.pontos,
      showCancelButton: true,
    });
    if (novosPontos !== undefined && novosPontos !== null) {
      const { value: motivo } = await Swal.fire({
        title: 'Motivo',
        input: 'text',
        showCancelButton: true,
        inputValidator: (value) => (!value ? 'Obrigatório!' : null),
      });
      if (motivo) {
        this.userService
          .updatePontos(user.id, this.getAdminId(), Number(novosPontos), motivo)
          .subscribe(() => {
            user.pontos = Number(novosPontos);
            this.cd.detectChanges();
            Swal.fire('Salvo', 'Pontuação atualizada.', 'success');
          });
      }
    }
  }

  async alterarGrupo(user: any, event: any) {
    const novoGrupoId = event.target.value === 'null' ? null : Number(event.target.value);
    const grupoAntigoId = user.grupo_id;

    const { value: motivo } = await Swal.fire({
      title: 'Alterar Grupo de Apostas',
      text: 'Justifique a mudança de grupo para este usuário:',
      input: 'text',
      inputPlaceholder: 'Motivo da alteração...',
      showCancelButton: true,
      confirmButtonColor: '#d97706',
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório!' : null),
    });

    if (motivo) {
      this.userService.updateUserGroup(user.id, novoGrupoId, motivo, this.getAdminId()).subscribe({
        next: () => {
          user.grupo_id = novoGrupoId;
          const grupoEncontrado = this.gruposApostas.find((g) => g.id === novoGrupoId);
          user.grupo_nome = grupoEncontrado ? grupoEncontrado.nome : 'Sem Grupo';

          Swal.fire({
            title: 'Sucesso',
            text: 'Grupo de apostas atualizado.',
            icon: 'success',
            timer: 1500,
          });
          this.cd.detectChanges();
        },
        error: () => {
          event.target.value = grupoAntigoId === null ? 'null' : grupoAntigoId;
          Swal.fire('Erro', 'Falha ao atualizar o grupo.', 'error');
        },
      });
    } else {
      event.target.value = grupoAntigoId === null ? 'null' : grupoAntigoId;
    }
  }

  async onFileChange(evt: any) {
    const target: DataTransfer = <DataTransfer>evt.target;
    if (target.files.length !== 1) return;
    const { value: motivoGlobal } = await Swal.fire({
      title: 'Motivo da Importação',
      input: 'text',
      showCancelButton: true,
      inputValidator: (value) => (!value ? 'Obrigatório!' : null),
    });
    if (!motivoGlobal) return;

    this.loading = true;
    const reader: FileReader = new FileReader();
    reader.onload = (e: any) => {
      const bstr: string = e.target.result;
      const wb: XLSX.WorkBook = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rawData = XLSX.utils.sheet_to_json(ws);
      const formattedData = rawData
        .map((item: any) => {
          const getVal = (candidates: string[]) => {
            const key = Object.keys(item).find((k) =>
              candidates.includes(
                k
                  .toLowerCase()
                  .trim()
                  .normalize('NFD')
                  .replace(/[\u0300-\u036f]/g, ''),
              ),
            );
            return key ? item[key] : null;
          };
          return {
            nome_completo: getVal(['nome', 'funcionario', 'name']),
            email: getVal(['email', 'mail']),
            setor: getVal(['setor', 'area', 'departamento']),
            grupo: getVal(['grupo', 'group', 'apostas']),
            pontos: getVal(['pontos', 'pts']),
            empresa: getVal(['empresa', 'company']),
            perfil: getVal(['perfil', 'role']),
            status: getVal(['status', 'ativo']),
          };
        })
        .filter((u) => u.email);

      this.userService.updateEmMassa(formattedData, this.getAdminId(), motivoGlobal).subscribe({
        next: () => {
          Swal.fire('Sucesso', 'Importação concluída.', 'success');
          this.carregarDados();
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.message || 'Falha na importação', 'error');
        },
      });
    };
    reader.readAsBinaryString(target.files[0]);
  }

  private getValorCampoUsuario(u: any, key: string): string | number {
    switch (key) {
      case 'nome': return u.nome_completo ?? '';
      case 'email': return u.email ?? '';
      case 'empresa': return u.empresa || '';
      case 'setor': return u.setor || '';
      case 'grupo_apostas': return u.grupo_nome || '';
      case 'pontos': return u.pontos ?? 0;
      case 'status': return u.ativo ? 'Ativo' : 'Inativo';
      case 'perfil': return u.perfil ?? '';
      default: return '';
    }
  }

  exportarExcel() {
    this.settingsService.getExportSettings().pipe(
      catchError(() => of(null)),
    ).subscribe({
      next: (settings) => {
        const fields = this.settingsService.parseUsuariosFields(settings).filter((f) => f.enabled !== false);
        const colunas = fields.map((f) => f.label);
        const dados = this.users.map((u) => {
          const row: Record<string, string | number> = {};
          fields.forEach((f) => { row[f.label] = this.getValorCampoUsuario(u, f.key); });
          return row;
        });
        const ws = colunas.length ? XLSX.utils.json_to_sheet(dados) : XLSX.utils.aoa_to_sheet([[]]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
        XLSX.writeFile(wb, 'Relatorio_Usuarios.xlsx');
      },
      error: () => {
        const dados = this.users.map((u) => ({
          Nome: u.nome_completo,
          Email: u.email,
          Empresa: u.empresa || '',
          Setor: u.setor || '',
          GrupoApostas: u.grupo_nome || '',
          Pontos: u.pontos || 0,
          Status: u.ativo ? 'Ativo' : 'Inativo',
          Perfil: u.perfil,
        }));
        const ws = XLSX.utils.json_to_sheet(dados);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
        XLSX.writeFile(wb, 'Relatorio_Usuarios.xlsx');
      },
    });
  }

  getFotoUrl(path: string) {
    if (!path) return '';
    if (path === 'db') return '';
    return path.startsWith('http') ? path : `${this.apiUrl}/${path.replace(/\\/g, '/')}`;
  }

  getAvatarUrl(user: { foto?: string; id?: number }): string {
    if (!user?.foto) return '';
    if (user.foto === 'db' && user.id) return `${environment.apiUri}/users/${user.id}/avatar`;
    return this.getFotoUrl(user.foto);
  }

  sincronizar() {
    this.loading = true;
    this.userService.syncUsers().subscribe({
      next: (res: any) => {
        Swal.fire('Sucesso', res.message, 'success');
        this.carregarDados();
      },
      error: (err) => {
        this.loading = false;
        Swal.fire('Falha', err.error?.details || 'Erro desconhecido', 'error');
      },
    });
  }

  async verLogs(user: any) {
    this.userService.getHistorico(user.id).subscribe({
      next: (logs: any[]) => {
        if (logs.length === 0) {
          Swal.fire('Informação', 'Nenhum log encontrado.', 'info');
          return;
        }

        const rows = logs
          .map((log) => {
            const dataFormatada = new Date(log.data_alteracao).toLocaleString('pt-BR');
            let colunaMudanca = '';
            if (log.pontos_antes !== log.pontos_depois) {
              const diff = log.pontos_depois - log.pontos_antes;
              const cor = diff > 0 ? 'text-emerald-600' : 'text-rose-600';
              const sinal = diff > 0 ? '+' : '';
              colunaMudanca = `<span class="font-bold ${cor} whitespace-nowrap">${log.pontos_antes} ➔ ${log.pontos_depois} (${sinal}${diff})</span>`;
            } else {
              colunaMudanca = `<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded border border-gray-200">CADASTRO</span>`;
            }
            return `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-3 text-gray-500 whitespace-nowrap align-top">${dataFormatada}</td>
                <td class="p-3 font-bold text-gray-700 whitespace-nowrap align-top">${log.admin_nome || 'Sistema'}</td>
                <td class="p-3 text-center align-top">${colunaMudanca}</td>
                <td class="p-3 text-sm text-gray-600 align-top leading-relaxed">${log.motivo}</td>
            </tr>`;
          })
          .join('');

        const tabelaHtml = `
            <div class="overflow-hidden rounded-lg border border-gray-200">
                <div class="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 bg-gray-50 shadow-sm z-10">
                            <tr class="text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                                <th class="p-3 border-b">Data</th><th class="p-3 border-b">Responsável</th>
                                <th class="p-3 border-b text-center">Tipo</th><th class="p-3 border-b w-full">Detalhes</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-100">${rows}</tbody>
                    </table>
                </div>
            </div>`;
        Swal.fire({
          title: `Histórico: ${user.nome_completo}`,
          html: tabelaHtml,
          width: '900px',
          showConfirmButton: false,
          customClass: { popup: 'rounded-xl' },
        });
      },
    });
  }

  // ==================================================================================
  // ADICIONAR PONTOS EM LOTE (VISUAL: DUAL LISTBOX COM FILTROS)
  // ==================================================================================
  async adicionarPontosEmLote() {
    const usersList = this.users.map((u) => ({
      id: u.id,
      label: `${u.nome_completo} (${u.email})`,
    }));
    const empresasList = this.gruposDisponiveis.map((e) => ({ id: e.id, label: e.nome }));
    const setoresList: any[] = [];

    this.gruposDisponiveis.forEach((emp) => {
      if (emp.setores) {
        emp.setores.forEach((s: any) => {
          setoresList.push({ id: s.id, label: `${s.nome} [🏢 ${emp.nome}]` });
        });
      }
    });

    const htmlContent = `
      <style>
        .dual-list-select option { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: all 0.1s; }
        .dual-list-select option:hover { background-color: #f8fafc; }
        .dual-list-select option:checked { background-color: #e0e7ff; color: #4338ca; font-weight: bold; }
      </style>
      <div class="text-left font-sans mt-2">
        
        <label class="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">1. Selecione o Tipo de Alvo</label>
        <select id="swal-target-type" class="swal2-select w-full m-0 mb-6 text-sm border-gray-300 rounded-xl bg-gray-50 focus:bg-white transition-colors">
           <option value="" disabled selected>Escolha uma categoria...</option>
           <option value="all">👥 Todos os Usuários Ativos (Global)</option>
           <option value="users">👤 Selecionar Usuários Específicos</option>
           <option value="empresas">🏢 Selecionar por Empresa</option>
           <option value="setores">📍 Selecionar por Departamento</option>
        </select>

        <div id="dual-list-container" class="hidden flex-col gap-2 mb-6 animate-fade-in">
           <label class="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">2. Filtre e transfira os selecionados</label>
           <div class="flex gap-3 items-stretch h-64 bg-gray-50 p-3 rounded-2xl border border-gray-200">
             
             <div class="flex-1 flex flex-col h-full">
                <span class="text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Itens Disponíveis</span>
                <input type="text" id="filter-available" placeholder="🔍 Pesquisar disponíveis..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                <select id="list-available" multiple class="dual-list-select flex-1 w-full border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 custom-scrollbar"></select>
             </div>

             <div class="flex flex-col gap-2 justify-center px-1">
                <button type="button" id="btn-add" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold" title="Adicionar Selecionados">&gt;</button>
                <button type="button" id="btn-add-all" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold text-xs" title="Adicionar Visíveis">&gt;&gt;</button>
                <button type="button" id="btn-remove" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold mt-2" title="Remover Selecionados">&lt;</button>
                <button type="button" id="btn-remove-all" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold text-xs" title="Remover Visíveis">&lt;&lt;</button>
             </div>

             <div class="flex-1 flex flex-col h-full">
                <span class="text-[10px] font-bold text-emerald-600 uppercase mb-1 text-center">Itens Selecionados</span>
                <input type="text" id="filter-selected" placeholder="🔍 Pesquisar selecionados..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md outline-none focus:border-emerald-400 focus:ring-1 focus:ring-emerald-400">
                <select id="list-selected" multiple class="dual-list-select flex-1 w-full border border-emerald-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-emerald-500 custom-scrollbar shadow-[inset_0_0_10px_rgba(16,185,129,0.05)]"></select>
             </div>
           </div>
        </div>

        <div class="grid grid-cols-3 gap-4 border-t border-gray-100 pt-5">
           <div class="col-span-1">
              <label class="block text-xs font-extrabold text-emerald-600 uppercase mb-1">Pontos (+)</label>
              <input id="swal-points" type="number" min="1" class="swal2-input w-full m-0 font-black text-emerald-600 text-center text-lg rounded-xl bg-emerald-50 border-emerald-200" placeholder="0">
           </div>
           <div class="col-span-2">
              <label class="block text-xs font-extrabold text-gray-500 uppercase mb-1">Motivo / Justificativa</label>
              <input id="swal-motive" type="text" class="swal2-input w-full m-0 rounded-xl border-gray-300" placeholder="Ex: Meta de Vendas Alcançada">
           </div>
        </div>
      </div>
    `;

    const { value: finalData } = await Swal.fire({
      title: '💰 Adicionar Pontos em Lote',
      html: htmlContent,
      width: '750px',
      showCancelButton: true,
      confirmButtonText: 'Aplicar Pontos',
      confirmButtonColor: '#10b981',
      cancelButtonText: 'Cancelar',
      focusConfirm: false,

      didOpen: () => {
        const typeSelect = document.getElementById('swal-target-type') as HTMLSelectElement;
        const listContainer = document.getElementById('dual-list-container');
        const listAv = document.getElementById('list-available') as HTMLSelectElement;
        const listSel = document.getElementById('list-selected') as HTMLSelectElement;
        const filterAv = document.getElementById('filter-available') as HTMLInputElement;
        const filterSel = document.getElementById('filter-selected') as HTMLInputElement;

        const applyFilter = (input: HTMLInputElement, select: HTMLSelectElement) => {
          const term = input.value.toLowerCase();
          Array.from(select.options).forEach((opt) => {
            opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
          });
        };

        filterAv.addEventListener('input', () => applyFilter(filterAv, listAv));
        filterSel.addEventListener('input', () => applyFilter(filterSel, listSel));

        const moveOptions = (
          source: HTMLSelectElement,
          target: HTMLSelectElement,
          moveAll: boolean = false,
        ) => {
          const options = moveAll
            ? Array.from(source.options).filter((o) => o.style.display !== 'none')
            : Array.from(source.selectedOptions);

          options.forEach((opt) => {
            opt.selected = false;
            opt.style.display = '';
            target.appendChild(opt);
          });

          const sortedOptions = Array.from(target.options).sort((a, b) =>
            a.text.localeCompare(b.text),
          );
          target.innerHTML = '';
          sortedOptions.forEach((opt) => target.appendChild(opt));

          applyFilter(filterAv, listAv);
          applyFilter(filterSel, listSel);
        };

        document
          .getElementById('btn-add')
          ?.addEventListener('click', () => moveOptions(listAv, listSel));
        document
          .getElementById('btn-add-all')
          ?.addEventListener('click', () => moveOptions(listAv, listSel, true));
        document
          .getElementById('btn-remove')
          ?.addEventListener('click', () => moveOptions(listSel, listAv));
        document
          .getElementById('btn-remove-all')
          ?.addEventListener('click', () => moveOptions(listSel, listAv, true));

        typeSelect.addEventListener('change', () => {
          const type = typeSelect.value;
          listAv.innerHTML = '';
          listSel.innerHTML = '';
          filterAv.value = '';
          filterSel.value = '';

          if (type === 'all' || type === '') {
            listContainer?.classList.add('hidden');
            listContainer?.classList.remove('flex');
          } else {
            listContainer?.classList.remove('hidden');
            listContainer?.classList.add('flex');

            let dataToLoad: any[] = [];
            if (type === 'users') dataToLoad = usersList;
            if (type === 'empresas') dataToLoad = empresasList;
            if (type === 'setores') dataToLoad = setoresList;

            dataToLoad.forEach((item) => {
              const opt = document.createElement('option');
              opt.value = item.id;
              opt.text = item.label;
              opt.title = item.label;
              listAv.appendChild(opt);
            });
          }
        });
      },

      preConfirm: () => {
        const targetType = (document.getElementById('swal-target-type') as HTMLSelectElement).value;
        const listSel = document.getElementById('list-selected') as HTMLSelectElement;
        const points = (document.getElementById('swal-points') as HTMLInputElement).value;
        const motive = (document.getElementById('swal-motive') as HTMLInputElement).value;

        if (!targetType || !points || Number(points) <= 0 || !motive) {
          Swal.showValidationMessage('Preencha os campos de Alvo, Pontos e Motivo obrigatórios.');
          return false;
        }

        const targetIds = Array.from(listSel.options).map((o) => Number(o.value));

        if (targetType !== 'all' && targetIds.length === 0) {
          Swal.showValidationMessage(
            'Transfira ao menos um item para a lista de "Selecionados" (Direita).',
          );
          return false;
        }

        return {
          targetType,
          targetIds,
          points: Number(points),
          motive,
          adminId: this.getAdminId(),
        };
      },
    });

    if (finalData) {
      this.loading = true;
      this.userService.addBatchPoints(finalData).subscribe({
        next: (res: any) => {
          this.loading = false;
          Swal.fire({ title: 'Sucesso!', text: res.message, icon: 'success', timer: 3000 });
          this.carregarDados();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.message || 'Falha ao adicionar pontos.', 'error');
        },
      });
    }
  }

  // ==================================================================================
  // ADICIONAR, EDITAR E EXCLUIR (Com Auditoria e Refresh Instantâneo)
  // ==================================================================================
  async adicionarUsuario() {
    let optionsHtml = `<option value="null">-- Sem Grupo de Apostas --</option>`;
    this.gruposApostas.forEach((g) => {
      optionsHtml += `<option value="${g.id}">🎲 ${g.nome}</option>`;
    });

    const { value: formValues } = await Swal.fire({
      title: 'Novo Usuário',
      width: '700px',
      html: `
        <div class="flex flex-col gap-3 text-left">
            <div class="grid grid-cols-2 gap-2">
                <div><label class="text-xs font-bold text-gray-500 uppercase">Nome</label><input id="swal-nome" class="swal2-input m-0 w-full"></div>
                <div><label class="text-xs font-bold text-gray-500 uppercase">Login</label><input id="swal-username" class="swal2-input m-0 w-full"></div>
            </div>
            <div class="grid grid-cols-2 gap-2">
                 <div><label class="text-xs font-bold text-gray-500 uppercase">E-mail</label><input id="swal-email" type="email" class="swal2-input m-0 w-full"></div>
                 <div><label class="text-xs font-bold text-gray-500 uppercase">Senha</label><input id="swal-senha" type="password" class="swal2-input m-0 w-full"></div>
            </div>
            <div>
                <label class="text-[10px] font-extrabold text-amber-600 uppercase">Grupo de Apostas</label>
                <select id="swal-grupo-aposta" class="swal2-select m-0 w-full text-sm rounded-lg border-amber-200 bg-amber-50 text-amber-700" style="display:flex;">
                    ${optionsHtml}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                <div><label class="text-xs font-bold text-gray-500 uppercase">Pontos</label><input id="swal-pontos" type="number" class="swal2-input m-0 w-full" value="0"></div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Perfil</label>
                    <select id="swal-perfil" class="swal2-select m-0 w-full" style="display:flex;">
                        <option value="USER">Usuário</option><option value="ADMIN">Admin</option>
                    </select>
                </div>
            </div>
            <div class="mt-1 border-t border-gray-100 pt-3">
                <label class="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Motivo / Justificativa (Auditoria)</label>
                <input id="swal-motivo" type="text" class="swal2-input m-0 w-full text-sm bg-indigo-50 border-indigo-200" placeholder="Ex: Contratação de novo colaborador">
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Criar',
      preConfirm: () => {
        const grp = (document.getElementById('swal-grupo-aposta') as HTMLSelectElement).value;
        const motivo = (document.getElementById('swal-motivo') as HTMLInputElement).value;

        if (!motivo) {
          Swal.showValidationMessage('O motivo é obrigatório para a auditoria!');
          return false;
        }

        return {
          nome_completo: (document.getElementById('swal-nome') as HTMLInputElement).value,
          email: (document.getElementById('swal-email') as HTMLInputElement).value,
          username: (document.getElementById('swal-username') as HTMLInputElement).value,
          senha: (document.getElementById('swal-senha') as HTMLInputElement).value,
          perfil: (document.getElementById('swal-perfil') as HTMLSelectElement).value,
          grupo_id: grp === 'null' ? null : Number(grp),
          empresa_id: null,
          setor_id: null,
          pontos: (document.getElementById('swal-pontos') as HTMLInputElement).value,
          motivo: motivo,
          adminId: this.getAdminId(),
        };
      },
    });

    if (formValues) {
      this.loading = true;
      this.userService.createUser(formValues).subscribe({
        next: () => {
          Swal.fire('Sucesso', 'Usuário criado!', 'success');
          this.carregarDados(); // Como é um novo, recarregamos para buscar o ID correto gerado no banco
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.message, 'error');
        },
      });
    }
  }

  async editarUsuario(user: any) {
    let optionsHtml = `<option value="null">-- Sem Grupo de Apostas --</option>`;
    this.gruposApostas.forEach((g) => {
      const isSelected = user.grupo_id === g.id ? 'selected' : '';
      optionsHtml += `<option value="${g.id}" ${isSelected}>🎲 ${g.nome}</option>`;
    });

    const { value: formValues } = await Swal.fire({
      title: `Editar: ${user.nome_completo}`,
      width: '700px',
      html: `
        <div class="flex flex-col gap-3 text-left">
            <div class="grid grid-cols-2 gap-2">
                <div><label class="text-xs font-bold text-gray-500 uppercase">Nome</label><input id="edit-nome" class="swal2-input m-0 w-full" value="${user.nome_completo}"></div>
                <div><label class="text-xs font-bold text-gray-500 uppercase">Login</label><input id="edit-username" class="swal2-input m-0 w-full" value="${user.username || ''}"></div>
            </div>
            <div>
                <label class="text-[10px] font-extrabold text-amber-600 uppercase">Grupo de Apostas</label>
                <select id="edit-grupo-aposta" class="swal2-select m-0 w-full text-sm rounded-lg border-amber-200 bg-amber-50 text-amber-700" style="display:flex;">
                    ${optionsHtml}
                </select>
            </div>
            <div class="grid grid-cols-2 gap-2">
                 <div><label class="text-xs font-bold text-gray-500 uppercase">E-mail</label><input id="edit-email" class="swal2-input m-0 w-full" value="${user.email}"></div>
                 <div><label class="text-xs font-bold text-gray-500 uppercase">Pontos</label><input id="edit-pontos" type="number" class="swal2-input m-0 w-full" value="${user.pontos}"></div>
            </div>
            <div><label class="text-xs font-bold text-amber-600 uppercase">Nova Senha (Opcional)</label><input id="edit-senha" type="password" class="swal2-input m-0 w-full" placeholder="Deixe em branco para não alterar"></div>
            
            <div class="mt-1 border-t border-gray-100 pt-3">
                <label class="text-[10px] font-extrabold text-indigo-600 uppercase tracking-wider">Motivo da Alteração (Auditoria)</label>
                <input id="edit-motivo" type="text" class="swal2-input m-0 w-full text-sm bg-indigo-50 border-indigo-200" placeholder="Ex: Correção de email / Alteração de grupo">
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      preConfirm: () => {
        const grp = (document.getElementById('edit-grupo-aposta') as HTMLSelectElement).value;
        const motivo = (document.getElementById('edit-motivo') as HTMLInputElement).value;

        if (!motivo) {
          Swal.showValidationMessage('O motivo é obrigatório para a auditoria!');
          return false;
        }

        return {
          nome_completo: (document.getElementById('edit-nome') as HTMLInputElement).value,
          email: (document.getElementById('edit-email') as HTMLInputElement).value,
          username: (document.getElementById('edit-username') as HTMLInputElement).value,
          senha: (document.getElementById('edit-senha') as HTMLInputElement).value,
          grupo_id: grp === 'null' ? null : Number(grp),
          empresa_id: user.empresa_id || null,
          setor_id: user.setor_id || null,
          pontos: (document.getElementById('edit-pontos') as HTMLInputElement).value,
          motivo: motivo,
          adminId: this.getAdminId(),
        };
      },
    });

    if (formValues) {
      if (!formValues.nome_completo || !formValues.email || !formValues.username) {
        Swal.fire('Atenção', 'Nome, E-mail e Login são obrigatórios.', 'warning');
        return;
      }

      this.loading = true;

      this.userService.updateUser(user.id, formValues).subscribe({
        next: () => {
          // Atualização Otimista UI (Instantânea localmente)
          user.nome_completo = formValues.nome_completo;
          user.email = formValues.email;
          user.username = formValues.username;
          user.pontos = Number(formValues.pontos);
          user.grupo_id = formValues.grupo_id;

          if (user.grupo_id) {
            const gEncontrado = this.gruposApostas.find((g) => g.id === user.grupo_id);
            user.grupo_nome = gEncontrado ? gEncontrado.nome : 'Sem Grupo';
          } else {
            user.grupo_nome = 'Sem Grupo';
          }

          this.loading = false;
          this.cd.detectChanges(); // Força a atualização da tabela instantaneamente
          Swal.fire({
            title: 'Sucesso',
            text: 'Dados atualizados!',
            icon: 'success',
            timer: 2000,
            showConfirmButton: false,
          });
        },
        error: () => {
          this.loading = false;
          Swal.fire('Erro', 'Falha ao salvar.', 'error');
        },
      });
    }
  }

  async excluirUsuario(user: any) {
    const { value: motivo, isConfirmed } = await Swal.fire({
      title: 'Excluir Usuário?',
      text: `Você vai excluir permanentemente "${user.nome_completo}". Justifique:`,
      icon: 'warning',
      input: 'text',
      inputPlaceholder: 'Motivo da exclusão...',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório para a auditoria!' : null),
    });

    if (isConfirmed && motivo) {
      this.loading = true;
      this.userService.deleteUser(user.id, this.getAdminId()).subscribe({
        next: () => {
          this.loading = false;
          // Remove da lista principal e refaz o filtro
          this.users = this.users.filter((u) => u.id !== user.id);
          this.filtrar();
          this.cd.detectChanges(); // FAZ A LINHA SUMIR DA TABELA NA HORA
          Swal.fire('Excluído!', 'O usuário foi removido do sistema.', 'success');
        },
        error: () => {
          this.loading = false;
          Swal.fire('Erro', 'Não foi possível excluir o usuário.', 'error');
        },
      });
    }
  }

  // ==================================================================================
  // ADICIONAR GRUPO EM LOTE (VISUAL: DUAL LISTBOX COM FILTROS)
  // ==================================================================================
  async adicionarGrupoEmLote() {
    const usersList = this.users.map((u) => ({
      id: u.id,
      label: `${u.nome_completo} (${u.email})`,
    }));
    const empresasList = this.gruposDisponiveis.map((e) => ({ id: e.id, label: e.nome }));
    const setoresList: any[] = [];

    this.gruposDisponiveis.forEach((emp) => {
      if (emp.setores) {
        emp.setores.forEach((s: any) => {
          setoresList.push({ id: s.id, label: `${s.nome} [🏢 ${emp.nome}]` });
        });
      }
    });

    let gruposOptions = `<option value="null">🎲 -- Remover Grupo (Sem Grupo) --</option>`;
    this.gruposApostas.forEach((g) => {
      gruposOptions += `<option value="${g.id}">🎲 ${g.nome}</option>`;
    });

    const htmlContent = `
      <style>
        .dual-list-select option { padding: 8px 12px; border-bottom: 1px solid #f3f4f6; cursor: pointer; transition: all 0.1s; }
        .dual-list-select option:hover { background-color: #f8fafc; }
        .dual-list-select option:checked { background-color: #fef3c7; color: #d97706; font-weight: bold; }
      </style>
      <div class="text-left font-sans mt-2">
        
        <label class="block text-xs font-extrabold text-gray-500 uppercase tracking-wider mb-2">1. Selecione o Tipo de Alvo</label>
        <select id="swal-target-type" class="swal2-select w-full m-0 mb-6 text-sm border-gray-300 rounded-xl bg-gray-50 focus:bg-white transition-colors">
           <option value="" disabled selected>Escolha uma categoria...</option>
           <option value="all">👥 Todos os Usuários Ativos (Global)</option>
           <option value="users">👤 Selecionar Usuários Específicos</option>
           <option value="empresas">🏢 Selecionar por Empresa</option>
           <option value="setores">📍 Selecionar por Departamento</option>
        </select>

        <div id="dual-list-container" class="hidden flex-col gap-2 mb-6 animate-fade-in">
           <label class="block text-xs font-extrabold text-indigo-600 uppercase tracking-wider mb-1">2. Filtre e transfira os selecionados</label>
           <div class="flex gap-3 items-stretch h-64 bg-gray-50 p-3 rounded-2xl border border-gray-200">
             
             <div class="flex-1 flex flex-col h-full">
                <span class="text-[10px] font-bold text-gray-500 uppercase mb-1 text-center">Itens Disponíveis</span>
                <input type="text" id="filter-available" placeholder="🔍 Pesquisar disponíveis..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400">
                <select id="list-available" multiple class="dual-list-select flex-1 w-full border border-gray-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-indigo-500 custom-scrollbar"></select>
             </div>

             <div class="flex flex-col gap-2 justify-center px-1">
                <button type="button" id="btn-add" class="bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold">&gt;</button>
                <button type="button" id="btn-add-all" class="bg-indigo-50 text-indigo-600 hover:bg-indigo-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold text-xs">&gt;&gt;</button>
                <button type="button" id="btn-remove" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold mt-2">&lt;</button>
                <button type="button" id="btn-remove-all" class="bg-rose-50 text-rose-600 hover:bg-rose-500 hover:text-white h-8 w-10 flex items-center justify-center rounded-lg shadow-sm transition-all active:scale-90 font-bold text-xs">&lt;&lt;</button>
             </div>

             <div class="flex-1 flex flex-col h-full">
                <span class="text-[10px] font-bold text-amber-600 uppercase mb-1 text-center">Itens Selecionados</span>
                <input type="text" id="filter-selected" placeholder="🔍 Pesquisar selecionados..." class="w-full mb-2 p-1.5 text-[11px] border border-gray-200 rounded-md outline-none focus:border-amber-400 focus:ring-1 focus:ring-amber-400">
                <select id="list-selected" multiple class="dual-list-select flex-1 w-full border border-amber-300 rounded-lg text-xs bg-white outline-none focus:ring-2 focus:ring-amber-500 custom-scrollbar shadow-[inset_0_0_10px_rgba(217,119,6,0.05)]"></select>
             </div>
           </div>
        </div>

        <div class="grid grid-cols-3 gap-4 border-t border-gray-100 pt-5">
           <div class="col-span-1">
              <label class="block text-xs font-extrabold text-amber-600 uppercase mb-1">Novo Grupo</label>
              <select id="swal-grupo" class="swal2-select w-full m-0 text-sm rounded-xl bg-amber-50 border-amber-200 text-amber-700 font-bold">
                 ${gruposOptions}
              </select>
           </div>
           <div class="col-span-2">
              <label class="block text-xs font-extrabold text-gray-500 uppercase mb-1">Motivo / Justificativa</label>
              <input id="swal-motive" type="text" class="swal2-input w-full m-0 rounded-xl border-gray-300" placeholder="Ex: Remanejamento para novo evento">
           </div>
        </div>
      </div>
    `;

    const { value: finalData } = await Swal.fire({
      title: '🎲 Atribuir Grupo em Lote',
      html: htmlContent,
      width: '750px',
      showCancelButton: true,
      confirmButtonText: 'Aplicar Grupo',
      confirmButtonColor: '#d97706', // Âmbar
      cancelButtonText: 'Cancelar',
      focusConfirm: false,

      didOpen: () => {
        const typeSelect = document.getElementById('swal-target-type') as HTMLSelectElement;
        const listContainer = document.getElementById('dual-list-container');
        const listAv = document.getElementById('list-available') as HTMLSelectElement;
        const listSel = document.getElementById('list-selected') as HTMLSelectElement;
        const filterAv = document.getElementById('filter-available') as HTMLInputElement;
        const filterSel = document.getElementById('filter-selected') as HTMLInputElement;

        const applyFilter = (input: HTMLInputElement, select: HTMLSelectElement) => {
          const term = input.value.toLowerCase();
          Array.from(select.options).forEach((opt) => {
            opt.style.display = opt.text.toLowerCase().includes(term) ? '' : 'none';
          });
        };

        filterAv.addEventListener('input', () => applyFilter(filterAv, listAv));
        filterSel.addEventListener('input', () => applyFilter(filterSel, listSel));

        const moveOptions = (
          source: HTMLSelectElement,
          target: HTMLSelectElement,
          moveAll: boolean = false,
        ) => {
          const options = moveAll
            ? Array.from(source.options).filter((o) => o.style.display !== 'none')
            : Array.from(source.selectedOptions);
          options.forEach((opt) => {
            opt.selected = false;
            opt.style.display = '';
            target.appendChild(opt);
          });
          const sortedOptions = Array.from(target.options).sort((a, b) =>
            a.text.localeCompare(b.text),
          );
          target.innerHTML = '';
          sortedOptions.forEach((opt) => target.appendChild(opt));
          applyFilter(filterAv, listAv);
          applyFilter(filterSel, listSel);
        };

        document
          .getElementById('btn-add')
          ?.addEventListener('click', () => moveOptions(listAv, listSel));
        document
          .getElementById('btn-add-all')
          ?.addEventListener('click', () => moveOptions(listAv, listSel, true));
        document
          .getElementById('btn-remove')
          ?.addEventListener('click', () => moveOptions(listSel, listAv));
        document
          .getElementById('btn-remove-all')
          ?.addEventListener('click', () => moveOptions(listSel, listAv, true));

        typeSelect.addEventListener('change', () => {
          const type = typeSelect.value;
          listAv.innerHTML = '';
          listSel.innerHTML = '';
          filterAv.value = '';
          filterSel.value = '';

          if (type === 'all' || type === '') {
            listContainer?.classList.add('hidden');
            listContainer?.classList.remove('flex');
          } else {
            listContainer?.classList.remove('hidden');
            listContainer?.classList.add('flex');
            let dataToLoad: any[] = [];
            if (type === 'users') dataToLoad = usersList;
            if (type === 'empresas') dataToLoad = empresasList;
            if (type === 'setores') dataToLoad = setoresList;

            dataToLoad.forEach((item) => {
              const opt = document.createElement('option');
              opt.value = item.id;
              opt.text = item.label;
              opt.title = item.label;
              listAv.appendChild(opt);
            });
          }
        });
      },

      preConfirm: () => {
        const targetType = (document.getElementById('swal-target-type') as HTMLSelectElement).value;
        const listSel = document.getElementById('list-selected') as HTMLSelectElement;
        const grupoVal = (document.getElementById('swal-grupo') as HTMLSelectElement).value;
        const motive = (document.getElementById('swal-motive') as HTMLInputElement).value;

        if (!targetType || !motive) {
          Swal.showValidationMessage('Preencha os campos de Alvo e Motivo obrigatórios.');
          return false;
        }

        const targetIds = Array.from(listSel.options).map((o) => Number(o.value));
        if (targetType !== 'all' && targetIds.length === 0) {
          Swal.showValidationMessage(
            'Transfira ao menos um item para a lista de "Selecionados" (Direita).',
          );
          return false;
        }

        return {
          targetType,
          targetIds,
          grupoId: grupoVal === 'null' ? null : Number(grupoVal),
          motive,
          adminId: this.getAdminId(),
        };
      },
    });

    if (finalData) {
      this.loading = true;
      // Precisamos criar essa função no service e no backend
      this.userService.updateBatchGroup(finalData).subscribe({
        next: (res: any) => {
          this.loading = false;
          Swal.fire({ title: 'Sucesso!', text: res.message, icon: 'success', timer: 3000 });
          this.carregarDados();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.message || 'Falha ao alterar os grupos.', 'error');
        },
      });
    }
  }
}
