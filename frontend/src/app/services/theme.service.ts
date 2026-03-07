import { DOCUMENT } from '@angular/common';
import { Inject, Injectable } from '@angular/core';

export type AppTheme =
  | 'claro'
  | 'claro-carbon'
  | 'claro-amber'
  | 'claro-forest'
  | 'claro-violet'
  | 'escuro'
  | 'escuro-carbon'
  | 'escuro-amber'
  | 'escuro-forest'
  | 'escuro-violet';

export const APP_THEMES: { value: AppTheme; label: string }[] = [
  { value: 'claro', label: 'Claro' },
  { value: 'claro-carbon', label: 'Claro (Carbon)' },
  { value: 'claro-amber', label: 'Claro (Amber)' },
  { value: 'claro-forest', label: 'Claro (Forest)' },
  { value: 'claro-violet', label: 'Claro (Violet)' },
  { value: 'escuro', label: 'Escuro (Indigo)' },
  { value: 'escuro-carbon', label: 'Escuro (Carbon)' },
  { value: 'escuro-amber', label: 'Escuro (Amber)' },
  { value: 'escuro-forest', label: 'Escuro (Forest)' },
  { value: 'escuro-violet', label: 'Escuro (Violet)' },
];

@Injectable({
  providedIn: 'root',
})
export class ThemeService {
  private readonly defaultTheme: AppTheme = 'claro';

  constructor(@Inject(DOCUMENT) private document: Document) {}

  initializeFromStorage(): AppTheme {
    const currentUser = this.getCurrentUser();
    const theme = this.normalizeTheme(currentUser?.tema_preferido);
    this.applyTheme(theme);
    return theme;
  }

  applyTheme(theme: AppTheme): void {
    this.document.documentElement.setAttribute('data-theme', theme);
  }

  setTheme(theme: AppTheme): void {
    const normalizedTheme = this.normalizeTheme(theme);
    this.applyTheme(normalizedTheme);
    this.persistOnCurrentUser(normalizedTheme);
  }

  resolveThemeFromUser(user?: any): AppTheme {
    return this.normalizeTheme(user?.tema_preferido);
  }

  private normalizeTheme(value?: string): AppTheme {
    const lightThemes: AppTheme[] = ['claro', 'claro-carbon', 'claro-amber', 'claro-forest', 'claro-violet'];
    const darkThemes: AppTheme[] = ['escuro', 'escuro-carbon', 'escuro-amber', 'escuro-forest', 'escuro-violet'];
    if (lightThemes.includes(value as AppTheme) || darkThemes.includes(value as AppTheme)) {
      return value as AppTheme;
    }
    return this.defaultTheme;
  }

  private getCurrentUser(): any | null {
    const rawUser = localStorage.getItem('currentUser');
    if (!rawUser) return null;

    try {
      return JSON.parse(rawUser);
    } catch {
      return null;
    }
  }

  private persistOnCurrentUser(theme: AppTheme): void {
    const user = this.getCurrentUser();
    if (!user) return;
    user.tema_preferido = theme;
    localStorage.setItem('currentUser', JSON.stringify(user));
  }
}
