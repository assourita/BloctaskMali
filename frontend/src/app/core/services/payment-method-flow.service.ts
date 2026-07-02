import { Injectable } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { PaymentMethod, PaymentService } from './payment.service';
import { PaymentMethodSetupDialogComponent } from '../../shared/components/payment-method-setup-dialog/payment-method-setup-dialog.component';

@Injectable({ providedIn: 'root' })
export class PaymentMethodFlowService {
  constructor(
    private paymentService: PaymentService,
  ) {}

  /** Ouvre le dialogue d'ajout si aucune méthode n'est enregistrée. */
  ensurePaymentMethod(dialog: MatDialog): Observable<boolean> {
    return this.paymentService.getPaymentMethods().pipe(
      switchMap((response) => {
        const methods = this.normalizeMethods(response);
        if (methods.length > 0) {
          return of(true);
        }
        const ref = dialog.open(PaymentMethodSetupDialogComponent, {
          width: '480px',
          disableClose: true,
          panelClass: 'payment-method-dialog',
        });
        return ref.afterClosed().pipe(map((saved) => !!saved));
      }),
    );
  }

  private normalizeMethods(response: PaymentMethod[] | { results?: PaymentMethod[] }): PaymentMethod[] {
    return Array.isArray(response) ? response : (response?.results ?? []);
  }
}
