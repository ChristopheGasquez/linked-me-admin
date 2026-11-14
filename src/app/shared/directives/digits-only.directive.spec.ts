import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DigitsOnlyDirective } from './digits-only.directive';

@Component({
  imports: [DigitsOnlyDirective],
  template: `<input appDigitsOnly />`,
})
class Host {}

describe('DigitsOnlyDirective', () => {
  let input: HTMLInputElement;

  // Returns true when the directive blocked the input
  function blocks(inputType: string, data: string | null): boolean {
    const event = new InputEvent('beforeinput', { inputType, data, cancelable: true });
    input.dispatchEvent(event);
    return event.defaultPrevented;
  }

  beforeEach(async () => {
    const fixture = TestBed.createComponent(Host);
    await fixture.whenStable();
    input = fixture.nativeElement.querySelector('input');
  });

  it('lets digits through', () => {
    expect(blocks('insertText', '7')).toBe(false);
    expect(blocks('insertFromPaste', '123')).toBe(false);
  });

  it.each(['a', '-', '.', ' '])('blocks the non-digit character %j', (char) => {
    expect(blocks('insertText', char)).toBe(true);
  });

  it('blocks a paste containing any non-digit', () => {
    expect(blocks('insertFromPaste', 'abc12')).toBe(true);
  });

  it('lets deletions through', () => {
    expect(blocks('deleteContentBackward', null)).toBe(false);
  });
});
