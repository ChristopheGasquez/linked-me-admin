import { Component } from '@angular/core';
import { TranslocoDirective } from '@jsverse/transloco';

import { ProfileInfo } from '../../components/profile-info/profile-info';
import { ProfileSecurity } from '../../components/profile-security/profile-security';
import { SessionsList } from '../../components/sessions-list/sessions-list';

@Component({
  selector: 'app-profile',
  templateUrl: './profile.html',
  styleUrl: './profile.scss',
  imports: [TranslocoDirective, ProfileInfo, ProfileSecurity, SessionsList],
})
export class Profile {}
