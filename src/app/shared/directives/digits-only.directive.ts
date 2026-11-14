import { Directive } from '@angular/core';

// Blocks any non-digit input (typing, paste, drop) before it reaches the field
@Directive({
  selector: 'input[appDigitsOnly]',
  host: { '(beforeinput)': 'onBeforeInput($event)' },
})
export class DigitsOnlyDirective {
  onBeforeInput(event: InputEvent): void {
    const data = event.data ?? event.dataTransfer?.getData('text') ?? '';
    if (/\D/.test(data)) {
      event.preventDefault();
    }
  }
}
