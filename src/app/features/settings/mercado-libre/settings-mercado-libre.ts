import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { TranslocoDirective, TranslocoService } from '@jsverse/transloco';
import { MercadoLibreService } from '../../../application/services/mercado-libre.service';
import { ButtonComponent, IconComponent, ToastService } from '@underlayerdev/ui';

@Component({
  selector: 'um-settings-mercado-libre',
  imports: [ButtonComponent, IconComponent, RouterLink, TranslocoDirective],
  templateUrl: './settings-mercado-libre.html',
  styleUrl: './settings-mercado-libre.scss',
})
export class SettingsMercadoLibreComponent implements OnInit {
  protected readonly mercadoLibreService = inject(MercadoLibreService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly transloco = inject(TranslocoService);
  private readonly toastService = inject(ToastService);

  async ngOnInit(): Promise<void> {
    const params = this.route.snapshot.queryParamMap;
    const connected = params.get('connected');
    const error = params.get('error');

    if (connected) {
      this.toastService.success(this.transloco.translate('settings.mercadoLibreConnected'));
    } else if (error) {
      this.toastService.error(this.transloco.translate('settings.mercadoLibreConnectError'));
    }

    if (connected || error) {
      // Clears ?connected=/?error= so refreshing the page doesn't re-show
      // the toast; replaceUrl so back doesn't return to this transient state.
      await this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
    }

    await this.mercadoLibreService.refreshStatus();
  }

  async onConnectClick(): Promise<void> {
    await this.mercadoLibreService.connect();
  }
}
