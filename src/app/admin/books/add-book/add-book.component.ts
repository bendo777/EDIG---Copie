import { Component, OnInit, AfterViewInit, Input, Output, EventEmitter } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SupabaseService } from 'src/app/shared/services/supabase.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router } from '@angular/router';

declare var feather: any;

interface Level {
  id: string; // UUID
  name: string;
}

interface Book {
  id?: string;
  title: string;
  author: string;
  publisher?: string;
  subject?: string;
  description?: string;
  image?: string;
  image_url?: string; // Add image_url to match manualData structure
  level_id: string; // UUID
  is_new: boolean; // Default to false if not provided
  is_popular: boolean; // Default to false if not provided
}

@Component({
  selector: 'app-add-book',
  templateUrl: './add-book.component.html',
  styleUrls: ['./add-book.component.css'],
  standalone: true,
  imports: [FormsModule, CommonModule]
})
export class AddBookComponent implements OnInit, AfterViewInit {
  book: Book = {
    title: '',
    author: '',
    publisher: '',
    subject: '',
    description: '',
    image: '',
    image_url: '',
    level_id: '',
    is_new: false,
    is_popular: false,
  };
  isEditMode: boolean = false;
  bookId: string | null = null;

  levels: Level[] = [];
  selectedFile: File | null = null;
  message: string = ''; // ✅ pour afficher le message à l’utilisateur
  isError: boolean = false;
  @Input() showBackButton: boolean = false;
  @Output() cancel = new EventEmitter<void>();
  @Output() submitted = new EventEmitter<'create' | 'update'>();
  private _manualRecord: any | null = null;

  @Input()
  set manualRecord(value: any | null) {
    this._manualRecord = value;
    if (value) {
      this.isEditMode = true;
      this.book = {
        id: value.id,
        title: value.title ?? '',
        author: value.author ?? '',
        publisher: value.publisher ?? '',
        subject: value.subject ?? '',
        description: value.description ?? '',
        image: value.image_url ?? '',
        image_url: value.image_url ?? '',
        level_id: value.level_id ?? '',
        is_new: !!value.is_new,
        is_popular: !!value.is_popular,
      };
      this.selectedFile = null;
      this.message = '';
      this.isError = false;
      this.refreshIcons();
    } else {
      this.selectedFile = null;
      if (!this.bookId) {
        this.isEditMode = false;
        this.resetForm();
      }
    }
  }

  get manualRecord(): any | null {
    return this._manualRecord;
  }

  constructor(private supabaseService: SupabaseService, private route: ActivatedRoute, private router: Router) {}

  ngOnInit(): void {
    this.loadLevels();
    this.route.paramMap.subscribe(params => {
      this.bookId = params.get('id');
      if (this.bookId) {
        this.isEditMode = true;
        this.loadBookDetails(this.bookId);
      }
    });
    this.refreshIcons();
  }

  ngAfterViewInit(): void {
    this.refreshIcons();
  }

  async loadBookDetails(id: string): Promise<void> {
    const { data, error } = await this.supabaseService.supabase
      .from('manuals')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error loading book details:', error);
      this.message = '❌ Erreur lors du chargement des détails du manuel.';
      this.isError = true;
      this.refreshIcons();
    } else if (data) {
      this.book = {
        id: data.id,
        title: data.title ?? '',
        author: data.author ?? '',
        publisher: data.publisher ?? '',
        subject: data.subject ?? '',
        description: data.description ?? '',
        image: data.image_url ?? '',
        image_url: data.image_url ?? '',
        level_id: data.level_id ?? '',
        is_new: !!data.is_new,
        is_popular: !!data.is_popular,
      };
      this.refreshIcons();
      this.refreshIcons();
    } else {
      console.warn('No book found for ID:', id);
      this.message = '⚠️ Aucun manuel trouvé pour cet ID.';
      this.isError = true;
      this.router.navigate(['/admin/books/list']); // Redirect if book not found
      this.refreshIcons();
    }
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
      console.log("Niveaux chargés :", this.levels);
      this.refreshIcons();
    }
  }

  onImageSelected(event: any): void {
    const file: File = event.target.files[0];
    if (file) {
      this.selectedFile = file;
      const reader = new FileReader();
      reader.onload = (e: any) => {
        this.book.image = e.target.result; // Store base64 for preview
        this.book.image_url = e.target.result; // Also store in image_url for consistency with manualData
        this.refreshIcons();
      };
      reader.readAsDataURL(file);
    }
  }

  removeImage(): void {
    this.selectedFile = null;
    this.book.image = '';
    this.book.image_url = '';
    this.refreshIcons();
  }

  async addBook(event: Event) {
    event.preventDefault(); // Prevent default form submission behavior
    this.message = ''; // Clear previous messages
    this.isError = false;

    try {
      const user = await this.supabaseService.getUser();

      if (!user) {
        console.error("Utilisateur non connecté pour l'ajout/modification !");
        throw new Error('User not authenticated or user data is missing.');
      }
      // console.log("Niveau sélectionné :", this.book.level_id);

      const manualData = {
        title: this.book.title,
        author: this.book.author,
        publisher: this.book.publisher,
        subject: this.book.subject,
        description: this.book.description,
        image_url: this.book.image_url || null,
        is_new: this.book.is_new || false,
        is_popular: this.book.is_popular || false,
        level_id: this.book.level_id,
        // created_by and created_at should not be updated during edit
      };

      if (this.isEditMode && this.book.id) {
        const { error } = await this.supabaseService.supabase
          .from('manuals')
          .update(manualData)
          .eq('id', this.book.id);

        if (error) {
          throw error;
        }
        console.log("Manuel mis à jour avec succès !");
        this.message = '✅ Manuel mis à jour avec succès !';
        this.submitted.emit('update');
        this.refreshIcons();
      } else {
        // Add new book logic (existing logic)
        const newManualData = {
          ...manualData,
          created_by: user.id,
          created_at: new Date().toISOString(),
        };
        await this.supabaseService.addBook(newManualData);
        console.log("Manuel ajouté avec succès !");
        this.message = '📚 Manuel ajouté avec succès !';
        this.refreshIcons();
        try {
          const key = 'recentActivities';
          const item = { message: `Manuel \"${this.book.title}\" ajouté.`, createdAt: new Date().toISOString() };
          const raw = localStorage.getItem(key);
          const arr = raw ? JSON.parse(raw) : [];
          const next = Array.isArray(arr) ? [item, ...arr] : [item];
          localStorage.setItem(key, JSON.stringify(next.slice(0, 6)));
        } catch {}
        this.submitted.emit('create');
      }

      this.isError = false;
      this.resetForm();

      setTimeout(() => {
        this.message = '';
        this.refreshIcons();
      }, 4000);

    } catch (error: any) {
      console.error("Erreur lors de l’ajout/modification du manuel :", error);
      this.message = `❌ Erreur lors de l'ajout/modification du manuel: ${error.message}`;
      this.isError = true;
      this.refreshIcons();
    }
  }

  resetForm(): void {
    this.book = {
      title: '',
      author: '',
      publisher: '',
      subject: '',
      description: '',
      image: '',
      image_url: '',
      level_id: '',
      is_new: false,
      is_popular: false,
    };
    this.selectedFile = null;
    this.message = ''; // Clear message on form reset
    this.isError = false; // Clear error status on form reset
    this.isEditMode = false;
    this.refreshIcons();
  }

  onCancel(): void {
    if (this.showBackButton) {
      this.cancel.emit();
    }
  }

  private refreshIcons(): void {
    setTimeout(() => {
      if (typeof feather !== 'undefined') {
        feather.replace();
      }
    });
  }
}
