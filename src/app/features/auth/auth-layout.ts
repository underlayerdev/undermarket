import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { NavbarComponent } from '@underlayerdev/ui';
import { SiteFooterComponent } from "../../shared/footer/footer";

@Component({
  selector: 'um-auth-layout',
  standalone: true,
  imports: [RouterOutlet, NavbarComponent, SiteFooterComponent],
  templateUrl: './auth-layout.html',
  styleUrl: './auth-layout.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AuthLayoutComponent {}
