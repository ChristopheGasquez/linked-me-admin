import { HttpTestingController } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { AuthService } from '../../../../core/services/auth.service';
import { provideTestDefaults, testUser } from '../../../../../testing/test-providers';
import { ProfileInfo } from '../../components/profile-info/profile-info';
import { ProfileSecurity } from '../../components/profile-security/profile-security';
import { Profile } from './profile';

describe('Profile', () => {
  let fixture: ComponentFixture<Profile>;

  const child = <T>(type: new (...args: never[]) => T): T =>
    fixture.debugElement.query(By.directive(type)).componentInstance;

  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem('access_token', 'access-1');
    TestBed.configureTestingModule({ providers: provideTestDefaults() });
    TestBed.inject(AuthService).currentUser.set(testUser(['realm:profile']));
    fixture = TestBed.createComponent(Profile);
    TestBed.tick();
    TestBed.inject(HttpTestingController)
      .expectOne((request) => request.url === '/auth/sessions')
      .flush({ data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } });
    await fixture.whenStable();
  });

  it('has no unsaved changes at first', () => {
    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(false);
  });

  it('has unsaved changes when the name is being edited', () => {
    const info = child(ProfileInfo);
    info.enable();
    info.infoForm.controls['name'].setValue('Jo');

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });

  it('has unsaved changes when a password is being typed', () => {
    const security = child(ProfileSecurity);
    security.enable();
    security.securityForm.controls['currentPassword'].setValue('o');

    expect(fixture.componentInstance.hasUnsavedChanges()).toBe(true);
  });
});
