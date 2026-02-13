import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserService } from '../../services/user.service';
import { GroupService } from '../../services/group.service';
import Swal from 'sweetalert2';
import * as XLSX from 'xlsx';

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
  gruposDisponiveis: any[] = [];
  loading = false;
  apiUrl = 'http://localhost:3005';

  constructor(
    private userService: UserService,
    private groupService: GroupService,
    private cd: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.carregarDados();
    this.carregarListaDeGrupos();
  }

  carregarListaDeGrupos() {
    this.groupService.getAllGroups().subscribe({
      next: (data) => {
        this.gruposDisponiveis = data;
      },
      error: () => console.error('Erro ao carregar lista de grupos'),
    });
  }

  carregarDados() {
    this.loading = true;
    this.userService.getUsers().subscribe({
      next: (data: any[]) => {
        this.users = data.map((u) => ({
          ...u,
          foto: u.foto || u.Foto || u.FOTO || null,
          empresa: u.empresa || u.Empresa || 'Empresa não definida',
          nome_completo: u.nome_completo || u.Nome || u.NOME,
          email: u.email || u.Email || u.EMAIL,
          ativo: u.ativo == 1 || u.ativo == true || u.Status === 'Ativo',
          perfil: u.perfil || u.Perfil || 'USER',
          pontos: u.pontos || u.Pontos || 0,
          setor: u.setor || u.Setor || 'GERAL',
          grupo_id: u.grupo_id || null,
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
        u.empresa?.toLowerCase().includes(term),
    );
  }

  private getAdminId(): number {
    const user = JSON.parse(localStorage.getItem('currentUser') || '{}');
    return user.id || 1;
  }

  // --- ALTERAR GRUPO (COM MOTIVO) ---
  async alterarGrupo(user: any, event: any) {
    const selectElement = event.target as HTMLSelectElement;
    const novoGrupoIdString = selectElement.value;
    const novoGrupoId = novoGrupoIdString === 'null' ? null : Number(novoGrupoIdString);
    const grupoAnteriorId = user.grupo_id;

    const { value: motivo } = await Swal.fire({
      title: 'Troca de Grupo',
      input: 'text',
      inputPlaceholder: 'Motivo da alteração...',
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      inputValidator: (value) => (!value ? 'O motivo é obrigatório!' : null),
    });

    if (motivo) {
      // CORRIGIDO: Passando os 4 argumentos separadamente
      this.userService.updateUserGroup(user.id, novoGrupoId, motivo, this.getAdminId()).subscribe({
        next: () => {
          user.grupo_id = novoGrupoId;
          const Toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 3000,
            timerProgressBar: true,
          });
          Toast.fire({ icon: 'success', title: 'Empresa atualizada' });
        },
        error: (err) => {
          console.error(err);
          Swal.fire('Erro', 'Não foi possível atualizar o grupo.', 'error');
          // Reverte visualmente em caso de erro
          selectElement.value = String(grupoAnteriorId !== null ? grupoAnteriorId : 'null');
          user.grupo_id = grupoAnteriorId;
        },
      });
    } else {
      // Reverte se cancelar o modal
      selectElement.value = String(grupoAnteriorId !== null ? grupoAnteriorId : 'null');
    }
  }

  // --- OUTRAS AÇÕES ---
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
            this.cd.detectChanges(); // Garante atualização visual
            Swal.fire('Sucesso', 'Perfil atualizado.', 'success');
          },
          error: () => {
            user.perfil = perfilAntigo;
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
          this.filtrar(); // Reaplica filtros visuais
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
            grupo: getVal(['grupo', 'group']),
            pontos: getVal(['pontos', 'pts']),
            empresa: getVal(['empresa', 'company']),
            perfil: getVal(['perfil', 'role']),
            status: getVal(['status', 'ativo']),
          };
        })
        .filter((u) => u.email);

      this.userService
        .updateEmMassa(formattedData, this.getAdminId(), motivoGlobal)
        .subscribe(() => {
          Swal.fire('Sucesso', 'Importação concluída.', 'success');
          this.carregarDados();
          (document.querySelector('input[type="file"]') as HTMLInputElement).value = '';
        });
    };
    reader.readAsBinaryString(target.files[0]);
  }

  exportarExcel() {
    const dados = this.users.map((u) => ({
      Nome: u.nome_completo,
      Email: u.email,
      Setor: u.setor || '',
      Pontos: u.pontos || 0,
      Empresa: u.empresa || '',
      Status: u.ativo ? 'Ativo' : 'Inativo',
      Perfil: u.perfil,
      Grupo: u.grupo_nome || 'Sem Empresa',
    }));
    const ws = XLSX.utils.json_to_sheet(dados);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Usuarios');
    XLSX.writeFile(wb, 'Relatorio_Usuarios.xlsx');
  }

  getFotoUrl(path: string) {
    if (!path) return '';
    return path.startsWith('http') ? path : `${this.apiUrl}/${path.replace(/\\/g, '/')}`;
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

            // Se for alteração de Pontos numérica (diferente de 0->0)
            if (log.pontos_antes !== log.pontos_depois) {
              const diff = log.pontos_depois - log.pontos_antes;
              const cor = diff > 0 ? 'text-emerald-600' : 'text-rose-600';
              const sinal = diff > 0 ? '+' : '';
              colunaMudanca = `<span class="font-bold ${cor} whitespace-nowrap">${log.pontos_antes} ➔ ${log.pontos_depois} (${sinal}${diff})</span>`;
            } else {
              colunaMudanca = `<span class="text-[10px] font-bold text-gray-400 bg-gray-100 px-2 py-1 rounded border border-gray-200">CADASTRO</span>`;
            }

            // AQUI ESTÁ O SEGREDO: text-sm e leading-relaxed para o HTML do motivo ficar bonito
            return `
            <tr class="border-b hover:bg-gray-50 transition-colors">
                <td class="p-3 text-gray-500 whitespace-nowrap align-top">${dataFormatada}</td>
                <td class="p-3 font-bold text-gray-700 whitespace-nowrap align-top">${log.admin_nome || 'Sistema'}</td>
                <td class="p-3 text-center align-top">${colunaMudanca}</td>
                <td class="p-3 text-sm text-gray-600 align-top leading-relaxed">
                   ${log.motivo} 
                </td>
            </tr>
          `;
          })
          .join('');

        const tabelaHtml = `
            <div class="overflow-hidden rounded-lg border border-gray-200">
                <div class="overflow-x-auto max-h-[500px] overflow-y-auto custom-scrollbar">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead class="sticky top-0 bg-gray-50 shadow-sm z-10">
                            <tr class="text-gray-500 uppercase font-bold text-[10px] tracking-wider">
                                <th class="p-3 border-b">Data</th>
                                <th class="p-3 border-b">Responsável</th>
                                <th class="p-3 border-b text-center">Tipo</th>
                                <th class="p-3 border-b w-full">Detalhes da Alteração</th>
                            </tr>
                        </thead>
                        <tbody class="bg-white divide-y divide-gray-100">${rows}</tbody>
                    </table>
                </div>
            </div>
        `;

        Swal.fire({
          title: `Histórico: ${user.nome_completo}`,
          html: tabelaHtml,
          width: '900px',
          showCloseButton: true,
          showConfirmButton: false,
          customClass: {
            popup: 'rounded-xl',
          },
        });
      },
      error: () => Swal.fire('Erro', 'Erro ao carregar logs.', 'error'),
    });
  }

  async adicionarUsuario() {
    // Gera as opções do Select de Grupo baseado na lista carregada
    const optionsGrupos = this.gruposDisponiveis
      .map((g) => `<option value="${g.id}">${g.nome}</option>`)
      .join('');

    const selectGrupoHtml = `
      <select id="swal-grupo" class="swal2-select m-0 w-full" style="display:flex;">
        <option value="null">-- Sem Empresa --</option>
        ${optionsGrupos}
      </select>
    `;

    const { value: formValues } = await Swal.fire({
      title: 'Novo Usuário Manual',
      html: `
        <div class="flex flex-col gap-3 text-left">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                    <input id="swal-nome" class="swal2-input m-0 w-full" placeholder="Ex: João Silva">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Usuário (Login)</label>
                    <input id="swal-username" class="swal2-input m-0 w-full" placeholder="Ex: joao.silva">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                 <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                    <input id="swal-email" type="email" class="swal2-input m-0 w-full" placeholder="Ex: joao@email.com">
                </div>
                 <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Setor</label>
                    <input id="swal-setor" class="swal2-input m-0 w-full" placeholder="Ex: TI">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Empresa</label>
                    ${selectGrupoHtml}
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Pontos Iniciais</label>
                    <input id="swal-pontos" type="number" class="swal2-input m-0 w-full" value="0">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Senha</label>
                    <input id="swal-senha" type="password" class="swal2-input m-0 w-full" placeholder="******">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Perfil</label>
                    <select id="swal-perfil" class="swal2-select m-0 w-full" style="display:flex;">
                        <option value="USER">Usuário Comum</option>
                        <option value="ADMIN">Administrador</option>
                    </select>
                </div>
            </div>
        </div>
      `,
      focusConfirm: false,
      width: '700px',
      showCancelButton: true,
      confirmButtonText: 'Criar',
      preConfirm: () => {
        return {
          nome_completo: (document.getElementById('swal-nome') as HTMLInputElement).value,
          email: (document.getElementById('swal-email') as HTMLInputElement).value,
          username: (document.getElementById('swal-username') as HTMLInputElement).value,
          senha: (document.getElementById('swal-senha') as HTMLInputElement).value,
          perfil: (document.getElementById('swal-perfil') as HTMLSelectElement).value,
          // NOVOS CAMPOS
          setor: (document.getElementById('swal-setor') as HTMLInputElement).value,
          grupo_id: (document.getElementById('swal-grupo') as HTMLSelectElement).value,
          pontos: (document.getElementById('swal-pontos') as HTMLInputElement).value,
          is_ad_user: 0,
        };
      },
    });

    if (formValues) {
      if (
        !formValues.nome_completo ||
        !formValues.username ||
        !formValues.senha ||
        !formValues.email
      ) {
        Swal.fire('Erro', 'Nome, Email, Usuário e Senha são obrigatórios.', 'error');
        return;
      }

      this.loading = true;
      this.userService.createUser(formValues).subscribe({
        next: () => {
          Swal.fire('Sucesso', 'Usuário criado com sucesso!', 'success');
          this.carregarDados();
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', err.error?.message || 'Erro ao criar usuário.', 'error');
        },
      });
    }
  }

  async excluirUsuario(user: any) {
    const result = await Swal.fire({
      title: 'Tem certeza?',
      text: `Você vai excluir permanentemente o usuário "${user.nome_completo}".`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Sim, excluir!',
      cancelButtonText: 'Cancelar',
    });

    if (result.isConfirmed) {
      this.loading = true;
      this.userService.deleteUser(user.id, this.getAdminId()).subscribe({
        next: () => {
          // REMOVIDO: this.carregarDados() (lento)
          // ADICIONADO: Remoção local instantânea
          this.users = this.users.filter((u) => u.id !== user.id);
          this.filtrar(); // Atualiza a lista filtrada na tela

          this.loading = false;
          this.cd.detectChanges();
          Swal.fire('Excluído!', 'O usuário foi removido.', 'success');
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', 'Não foi possível excluir o usuário.', 'error');
        },
      });
    }
  }

  async editarUsuario(user: any) {
    // Prepara o Select de Grupo com a opção atual selecionada
    const optionsGrupos = this.gruposDisponiveis
      .map((g) => {
        const selected = user.grupo_id === g.id ? 'selected' : '';
        return `<option value="${g.id}" ${selected}>${g.nome}</option>`;
      })
      .join('');

    const selectGrupoHtml = `
      <select id="edit-grupo" class="swal2-select m-0 w-full" style="display:flex;">
        <option value="null" ${!user.grupo_id ? 'selected' : ''}>-- Sem empresa --</option>
        ${optionsGrupos}
      </select>
    `;

    const { value: formValues } = await Swal.fire({
      title: `Editar: ${user.nome_completo}`,
      width: '700px',
      html: `
        <div class="flex flex-col gap-3 text-left">
            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Nome Completo</label>
                    <input id="edit-nome" class="swal2-input m-0 w-full" value="${user.nome_completo}">
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Usuário (Login)</label>
                    <input id="edit-username" class="swal2-input m-0 w-full" value="${user.username || ''}">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                 <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">E-mail</label>
                    <input id="edit-email" class="swal2-input m-0 w-full" value="${user.email}">
                </div>
                 <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Setor</label>
                    <input id="edit-setor" class="swal2-input m-0 w-full" value="${user.setor || ''}">
                </div>
            </div>

            <div class="grid grid-cols-2 gap-2">
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Empresa</label>
                    ${selectGrupoHtml}
                </div>
                <div>
                    <label class="text-xs font-bold text-gray-500 uppercase">Pontos</label>
                    <input id="edit-pontos" type="number" class="swal2-input m-0 w-full" value="${user.pontos}">
                </div>
            </div>

            <div>
                <label class="text-xs font-bold text-gray-500 uppercase text-amber-600">Nova Senha (Opcional)</label>
                <input id="edit-senha" type="password" class="swal2-input m-0 w-full" placeholder="Deixe em branco para manter a atual">
            </div>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar Alterações',
      preConfirm: () => {
        return {
          nome_completo: (document.getElementById('edit-nome') as HTMLInputElement).value,
          email: (document.getElementById('edit-email') as HTMLInputElement).value,
          username: (document.getElementById('edit-username') as HTMLInputElement).value,
          senha: (document.getElementById('edit-senha') as HTMLInputElement).value,
          // NOVOS CAMPOS
          setor: (document.getElementById('edit-setor') as HTMLInputElement).value,
          grupo_id: (document.getElementById('edit-grupo') as HTMLSelectElement).value,
          pontos: (document.getElementById('edit-pontos') as HTMLInputElement).value,
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
          // Atualiza dados locais para refletir na tabela instantaneamente
          user.nome_completo = formValues.nome_completo;
          user.email = formValues.email;
          user.username = formValues.username;
          user.setor = formValues.setor;
          user.pontos = Number(formValues.pontos);
          user.grupo_id = formValues.grupo_id === 'null' ? null : Number(formValues.grupo_id);

          this.loading = false;
          this.cd.detectChanges();
          Swal.fire('Sucesso', 'Dados atualizados!', 'success');
        },
        error: (err) => {
          this.loading = false;
          Swal.fire('Erro', 'Não foi possível atualizar o usuário.', 'error');
        },
      });
    }
  }
}
