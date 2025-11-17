import { Component, OnInit, AfterViewInit } from '@angular/core';
declare var feather: any;

@Component({
  selector: 'app-catalog',
  templateUrl: './catalog.component.html',
  styleUrls: ['./catalog.component.css'],
})
export class CatalogComponent implements OnInit, AfterViewInit {
  ngOnInit(): void {
    // Any initialization logic can go here
  }

  ngAfterViewInit(): void {
    // This will ensure feather icons are replaced after the view is rendered
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
    this.initFilterButtons();
    this.initBookCardAnimations();
  }

  initFilterButtons(): void {
    document.querySelectorAll<HTMLElement>('.filter-btn').forEach(button => {
      button.addEventListener('click', function() {
        document.querySelectorAll<HTMLElement>('.filter-btn').forEach(btn => btn.classList.remove('active'));
        this.classList.add('active');
      });
    });
  }

  initBookCardAnimations(): void {
    document.querySelectorAll<HTMLElement>('.book-card').forEach((card, index) => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px)';

      setTimeout(() => {
        card.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, index * 100);
    });
  }
}

