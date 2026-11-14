import { TestbedHarnessEnvironment } from '@angular/cdk/testing/testbed';
import { TestBed } from '@angular/core/testing';
import { MatMenuHarness } from '@angular/material/menu/testing';
import { TranslocoService } from '@jsverse/transloco';

import { fr, provideTestDefaults } from '../../../../testing/test-providers';
import { LangSwitcher } from './lang-switcher';

describe('LangSwitcher', () => {
  async function openMenu() {
    const fixture = TestBed.createComponent(LangSwitcher);
    const menu = await TestbedHarnessEnvironment.loader(fixture).getHarness(MatMenuHarness);
    await menu.open();
    return menu;
  }

  beforeEach(() => TestBed.configureTestingModule({ providers: provideTestDefaults() }));

  it('lists the available languages and marks the active one', async () => {
    const items = await (await openMenu()).getItems();
    const texts = await Promise.all(items.map((item) => item.getText()));

    expect(texts).toHaveLength(2);
    expect(texts[0]).toContain(fr.common.langs.fr);
    expect(texts[0]).toContain('check');
    expect(texts[1]).not.toContain('check');
  });

  it('switches the active language', async () => {
    await (await openMenu()).clickItem({ text: new RegExp(fr.common.langs.en) });

    expect(TestBed.inject(TranslocoService).getActiveLang()).toBe('en');
  });
});
