import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ThemeService } from './services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  // O template é SÓ ISSO. O Router decide qual layout carregar.
  template: `<router-outlet></router-outlet>`,
})
export class App {
  constructor(private themeService: ThemeService) {
    this.themeService.initializeFromStorage();
  }
}
