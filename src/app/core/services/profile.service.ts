import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

import { ProfilesApiService } from '../../shared/services/profiles-api.service';
import { ApiMessage } from '../../shared/models/api-response.model';
import { ProfileResponse } from '../../shared/models/profile.model';
import { AuthService } from './auth.service';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  #profilesApi = inject(ProfilesApiService);
  #authService = inject(AuthService);

  updateProfile(name: string): Observable<ProfileResponse> {
    return this.#profilesApi.updateProfile(name).pipe(
      tap((profile) =>
        this.#authService.currentUser.update(u => u ? { ...u, name: profile.name } : u),
      ),
    );
  }

  changePassword(currentPassword: string, newPassword: string): Observable<ApiMessage> {
    return this.#profilesApi.changePassword(currentPassword, newPassword);
  }
}
