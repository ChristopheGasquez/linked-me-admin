import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-public-layout',
  imports: [RouterOutlet],
  template: '<p>public-layout works!</p><router-outlet />',
})
export class PublicLayout {}
