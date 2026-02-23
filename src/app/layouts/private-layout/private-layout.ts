import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-private-layout',
  imports: [RouterOutlet],
  template: '<p>private-layout works!</p><router-outlet />',
})
export class PrivateLayout {}
