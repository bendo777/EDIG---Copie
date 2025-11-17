import { Component, OnInit, AfterViewInit } from '@angular/core';
import { SupabaseService } from 'src/app/shared/services/supabase.service';
import { ManualDetailsModalComponent } from 'src/app/shared/components/manual-details-modal/manual-details-modal.component';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

declare var feather: any; // Declare feather to avoid TypeScript errors

interface Book {
  id: string;
  title: string;
  author: string;
  publisher?: string; // Made optional to match Manual interface
  subject?: string;   // Made optional to match Manual interface
  description?: string;
  image_url?: string;
  level_id: string;
  is_new: boolean;
  is_popular: boolean;
  created_by: string;
  created_at: string;
}

@Component({
  selector: 'app-list-books',
  templateUrl: './list-books.component.html',
  styleUrls: ['./list-books.component.css'],
  standalone: true,
  imports: [CommonModule, ManualDetailsModalComponent, RouterLink]
})
export class ListBooksComponent implements OnInit, AfterViewInit {

  books: Book[] = [];
  selectedManual: Book | null = null;
  isModalVisible: boolean = false;

  constructor(private supabaseService: SupabaseService) { }

  ngOnInit(): void {
    this.loadBooks();
  }

  openModal(manual: Book): void {
    this.selectedManual = manual;
    this.isModalVisible = true;
  }

  closeModal(): void {
    this.isModalVisible = false;
    this.selectedManual = null;
  }

  async deleteBook(bookId: string): Promise<void> {
    const bookToDelete = this.books.find(book => book.id === bookId);
    
    if (confirm("Êtes-vous sûr de vouloir supprimer ce manuel ?")) {
      const { error } = await this.supabaseService.supabase
        .from('manuals')
        .delete()
        .eq('id', bookId);

      if (error) {
        console.error('Error deleting book:', error);
        alert('Erreur lors de la suppression du manuel.');
      } else {
        this.books = this.books.filter(book => book.id !== bookId);
        alert('Manuel supprimé avec succès !');
        
        // Add deletion activity to localStorage
        if (bookToDelete) {
          try {
            const key = 'recentActivities';
            const item = { message: `Manuel "${bookToDelete.title}" supprimé.`, createdAt: new Date().toISOString() };
            const raw = localStorage.getItem(key);
            const arr = raw ? JSON.parse(raw) : [];
            const next = Array.isArray(arr) ? [item, ...arr] : [item];
            localStorage.setItem(key, JSON.stringify(next.slice(0, 6)));
          } catch (err) {
            console.error('Error saving deletion activity:', err);
          }
        }
      }
    }
  }

  async loadBooks(): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('manuals') // Assuming 'manuals' is your table name
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading books:', error);
    } else {
      this.books = data || [];
      console.log('Books loaded:', this.books);
    }
  }

  ngAfterViewInit(): void {
    if (typeof feather !== 'undefined') {
      feather.replace();
    }
  }
}
