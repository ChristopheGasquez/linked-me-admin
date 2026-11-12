import { Component, viewChild } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { ProfileInfo } from '../../components/profile-info/profile-info';
import { ProfileSecurity } from '../../components/profile-security/profile-security';
import { SessionsList } from '../../components/sessions-list/sessions-list';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  imports: [TranslocoDirective, ProfileInfo, ProfileSecurity, SessionsList],
})
export class Profile implements HasUnsavedChanges {
  private readonly info = viewChild.required(ProfileInfo);
  private readonly security = viewChild.required(ProfileSecurity);

  hasUnsavedChanges(): boolean {
    return this.info().hasUnsavedChanges() || this.security().hasUnsavedChanges();
  }
}
