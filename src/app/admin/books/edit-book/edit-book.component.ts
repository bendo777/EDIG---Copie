import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SupabaseService } from 'src/app/shared/services/supabase.service';

interface Level {
  id: string;
  name: string;
}

interface Book {
  id?: string;
  title: string;
  author: string;
  publisher?: string;
  subject?: string;
  description?: string;
  image_url?: string;
  level_id: string;
  is_new: boolean;
  is_popular: boolean;
  created_by: string;
  created_at: string;
}

@Component({
  selector: 'app-edit-book',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-book.component.html',
  styleUrls: ['./edit-book.component.css']
})
export class EditBookComponent implements OnInit {
  book: Book = {
    title: '',
    author: '',
    publisher: '',
    subject: '',
    description: '',
    image_url: '',
    level_id: '',
    is_new: false,
    is_popular: false,
    created_by: '',
    created_at: '',
  };
  bookId: string | null = null;
  levels: Level[] = [];
  message: string = '';
  isError: boolean = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private supabaseService: SupabaseService
  ) { }

  ngOnInit(): void {
    this.loadLevels();
    this.route.paramMap.subscribe(params => {
      this.bookId = params.get('id');
      if (this.bookId) {
        this.loadBookDetails(this.bookId);
      } else {
        this.router.navigate(['/admin/books/list']); // Redirect if no ID provided
      }
    });
  }

  async loadLevels(): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('levels')
      .select('id, name')
      .order('name');

    if (error) {
      console.error("Erreur lors du chargement des niveaux :", error);
    } else {
      this.levels = data || [];
    }
  }

  async loadBookDetails(id: string): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading book details for edit:', error);
      this.message = '❌ Erreur lors du chargement des détails du manuel.';
      this.isError = true;
    } else if (data) {
      this.book = data; 
    } else {
      this.message = '⚠️ Aucun manuel trouvé pour cet ID.';
      this.isError = true;
      this.router.navigate(['/admin/books/list']);
    }
  }

  async updateBook(event: Event): Promise<void> {
    event.preventDefault();
    this.message = '';
    this.isError = false;

    if (!this.bookId) {
      this.message = '❌ ID du manuel manquant pour la mise à jour.';
      this.isError = true;
      return;
    }

    try {
      const user = await this.supabaseService.getUser();
      if (!user) {
        throw new Error('User not authenticated for update.');
      }

      const manualData = {
        title: this.book.title,
        author: this.book.author,
        publisher: this.book.publisher,
        subject: this.book.subject,
        description: this.book.description,
        image_url: this.book.image_url || null,
        level_id: this.book.level_id,
        is_new: this.book.is_new,
        is_popular: this.book.is_popular,
      };

      const { error } = await this.supabaseService.supabase
        .from('manuals')
        .update(manualData)
        .eq('id', this.bookId);

      if (error) {
        throw error;
      }

      this.message = '✅ Manuel mis à jour avec succès !';
      this.isError = false;
      setTimeout(() => { this.message = ''; }, 4000);
      this.supabaseService.notifyManualUpdated(this.book.title);
      try {
        const key = 'recentActivities';
        const item = { message: `Manuel "${this.book.title}" modifié.`, createdAt: new Date().toISOString() };
        const raw = localStorage.getItem(key);
        const arr = raw ? JSON.parse(raw) : [];
        const next = Array.isArray(arr) ? [item, ...arr] : [item];
        localStorage.setItem(key, JSON.stringify(next.slice(0, 6)));
      } catch {}
      this.router.navigate(['/admin/books/list']); // Redirect after successful update

    } catch (error: any) {
      console.error('Erreur lors de la mise à jour du manuel :', error);
      this.message = `❌ Erreur lors de la mise à jour du manuel: ${error.message}`;
      this.isError = true;
    }
  }
}
