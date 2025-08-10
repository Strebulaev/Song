import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent {
  constructor(private router: Router) {}

  navigateToUpload() {
    this.router.navigate(['/upload']);
  }

  navigateToLibrary() {
    this.router.navigate(['/library']);
  }
}