import { Component, Input, Output, EventEmitter, SimpleChanges, OnChanges } from '@angular/core';
import { CommonModule } from '@angular/common';

interface Manual {
  id: string;
  title: string;
  author: string;
  publisher?: string | null | undefined;
  subject?: string | null | undefined;
  description?: string | null | undefined;
  image_url?: string | null | undefined;
  level_id?: string | null | undefined;
  is_new?: boolean | null | undefined;
  is_popular?: boolean | null | undefined;
  created_at: string;
}

declare var feather: any;

@Component({
  selector: 'app-manual-details-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './manual-details-modal.component.html',
  styleUrls: ['./manual-details-modal.component.css'],
})

export class ManualDetailsModalComponent implements OnChanges {
  @Input() manual: Manual | null = null;
  @Input() isVisible: boolean = false;
  @Output() close = new EventEmitter<void>();

  onClose(): void {
    this.close.emit();
  }

  ngOnChanges(_changes: SimpleChanges): void {
    setTimeout(() => {
      try {
        if (typeof feather !== 'undefined') {
          feather.replace();
        }
      } catch {
        // ignore feather errors in environments where it's unavailable
      }
    });
  }
}
