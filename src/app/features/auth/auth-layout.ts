import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '@underlayerdev/ui';
import { SiteFooterComponent } from '../../shared/footer/footer';

@Component({
  selector: 'um-auth-layout',
  imports: [RouterOutlet, NavbarComponent, SiteFooterComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
})
export class AuthLayoutComponent {}
