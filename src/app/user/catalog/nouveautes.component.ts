import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, AfterViewInit } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { SupabaseService } from 'src/app/shared/services/supabase.service';
import { User } from '@supabase/supabase-js';

interface Manual {
  id: string;
  title: string;
  author: string;
  publisher?: string | null;
  subject?: string | null;
  description?: string | null;
  image_url?: string | null;
  level_id?: string | null;
  is_new?: boolean | null;
  is_popular?: boolean | null;
  created_at: string;
}

interface Level { id: string; name: string; }

type SortOption = 'recent' | 'alphabetical' | 'popular';

@Component({
  selector: 'app-nouveautes',
  standalone: true,
  template: `
    <div class="page-shell">
      <!-- Fond de quadrillage pour toute la page -->
      <div class="page-shell__grid-background" aria-hidden="true"></div>
      
      <header class="site-header">
        <div class="site-header__inner">
          <a class="site-logo" routerLink="/bibliotheque">EDIG</a>
          <nav class="site-nav">
            <a class="site-nav__link" routerLink="/bibliotheque/collection">Catalogue</a>
            <a class="site-nav__link" routerLink="/bibliotheque/niveaux">Niveaux</a>
            <a class="site-nav__link site-nav__link--active" routerLink="/bibliotheque/nouveautes">Nouveautés</a>
            <a class="site-nav__link" routerLink="/bibliotheque/populaires">Populaires</a>
            <a class="site-nav__link" routerLink="/bibliotheque/a-propos">À propos</a>
            <a class="site-nav__link" routerLink="/bibliotheque/contact">Contacts</a>
          </nav>
          <div class="site-actions">
            <ng-container *ngIf="user; else noUser">
              <div class="site-profile" (click)="$event.stopPropagation(); toggleProfileMenu()" tabindex="0" role="button" aria-haspopup="true" [attr.aria-expanded]="showProfileMenu">
                <img
                  class="site-profile__avatar"
                  [src]="userAvatar"
                  [alt]="userName"
                  onerror="this.src='https://ui-avatars.com/api/?name='+encodeURIComponent(this.alt)+'&background=6366f1&color=fff&size=128'"
                />
                <div class="site-profile__info">
                  <span class="site-profile__name">{{ userName }}</span>
                </div>

                <div *ngIf="showProfileMenu" class="profile-menu" (click)="$event.stopPropagation()">
                  <div class="profile-menu__header">
                    <div class="profile-menu__avatar-wrap">
                      <img [src]="userAvatar" [alt]="userName" class="profile-menu__avatar" />
                    </div>
                    <div class="profile-menu__meta">
                      <div class="profile-menu__name">{{ userName }}</div>
                      <div class="profile-menu__email">{{ userEmail }}</div>
                    </div>
                  </div>
                  <ul class="profile-menu__list">
                    <li>
                      <a class="profile-menu__link" (click)="goToAccount()">
                        <i data-feather="user" class="w-4 h-4" aria-hidden="true"></i>
                        Mon compte
                      </a>
                    </li>
                    <li>
                      <button type="button" class="profile-menu__logout" (click)="logout()">
                        <i data-feather="log-out" class="w-4 h-4" aria-hidden="true"></i>
                        Se déconnecter
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </ng-container>
            <ng-template #noUser>
              <a routerLink="/login" class="site-actions__link">Se connecter</a>
              <a routerLink="/inscription" class="site-actions__cta">S'inscrire</a>
            </ng-template>
          </div>
        </div>
      </header>

      <section class="hero">
        <div class="hero__inner">
          <div class="hero__content">
            <span class="badge">Nouveautés</span>
            <h1>Les derniers manuels à découvrir dans la bibliothèque EDIG</h1>
            <p>Feuilletez les publications les plus récentes : ressources fraîchement ajoutées, prêtes à inspirer vos classes.</p>
            <a routerLink="/bibliotheque/collection" class="btn btn--primary">Explorer les nouveautés</a>
          </div>
          <div class="hero__visual">
            <div class="visual-bubble visual-bubble--amber" aria-hidden="true"></div>
            <div class="visual-bubble visual-bubble--indigo" aria-hidden="true"></div>
          </div>
        </div>
      </section>

      <section class="list">
        <div class="list__inner">
          <ng-container *ngIf="!isLoading; else loadingState">
            <ng-container *ngIf="filteredManuals.length; else emptyState">
              <div class="cards">
                <article class="card" *ngFor="let m of filteredManuals; trackBy: trackByManualId">
                  <div
                    class="card__image"
                    [style.backgroundImage]="getCardBackground(m)"
                    role="presentation"
                  ></div>
                  <div class="card__body">
                    <div class="card__tag">Nouveau</div>
                    <h3 class="card__title">{{ m.title }}</h3>
                    <p class="card__meta">
                      {{ m.subject || 'Sujet' }} · {{ getLevelName(m.level_id) }}
                    </p>
                    <p class="card__desc">
                      {{ m.description || 'Ressource pédagogique conforme aux programmes.' }}
                    </p>
                    <a routerLink="/bibliotheque/collection" class="card__link">Voir dans le catalogue</a>
                  </div>
                </article>
              </div>
            </ng-container>
          </ng-container>

          <ng-template #loadingState>
            <div class="cards cards--skeleton">
              <article class="card skeleton-card" *ngFor="let _ of skeletonItems">
                <div class="skeleton-card__image"></div>
                <div class="skeleton-card__body">
                  <div class="skeleton-line skeleton-line--short"></div>
                  <div class="skeleton-line skeleton-line--medium"></div>
                  <div class="skeleton-line skeleton-line--long"></div>
                  <div class="skeleton-line skeleton-line--short"></div>
                </div>
              </article>
            </div>
          </ng-template>

          <ng-template #emptyState>
            <div class="empty-state">
              <h3>Encore aucune nouveauté publiée.</h3>
              <p>Activez l’option «&nbsp;Nouveau&nbsp;» lors de l’ajout d’un manuel pour le faire apparaître ici.</p>
            </div>
          </ng-template>
        </div>
      </section>

      <footer class="site-footer">
        <div class="site-footer__inner">
          <div class="site-footer__brand">
            <a class="site-logo" routerLink="/bibliotheque">EDIG</a>
            <p>
              EDIG · édicef — Institut Pédagogique National<br />
              Votre partenaire pour l'éducation et les ressources pédagogiques de qualité.
            </p>
            <div class="site-footer__school-icons">
              <div class="school-icon" title="Manuels scolaires">
                <i data-feather="book" class="w-5 h-5 text-amber-400"></i>
              </div>
              <div class="school-icon" title="Cahiers d'exercices">
                <i data-feather="edit-3" class="w-5 h-5 text-sky-400"></i>
              </div>
              <div class="school-icon" title="Ressources numériques">
                <i data-feather="monitor" class="w-5 h-5 text-indigo-400"></i>
              </div>
              <div class="school-icon" title="Guides pédagogiques">
                <i data-feather="compass" class="w-5 h-5 text-emerald-400"></i>
              </div>
            </div>
          </div>
          <div class="site-footer__section">
            <h3 class="site-footer__section-title">
              <i data-feather="book-open" class="w-4 h-4"></i>
              Navigation
            </h3>
            <div class="site-footer__links">
              <a routerLink="/bibliotheque/collection">Collection complète</a>
              <a routerLink="/bibliotheque/niveaux">Niveaux scolaires</a>
              <a routerLink="/bibliotheque/nouveautes">Nouveautés</a>
              <a routerLink="/bibliotheque/populaires">Populaires</a>
              <a routerLink="/bibliotheque/a-propos">À propos</a>
              <a routerLink="/bibliotheque/contact">Contacts</a>
            </div>
          </div>
          <div class="site-footer__section">
            <h3 class="site-footer__section-title">
              <i data-feather="share-2" class="w-4 h-4"></i>
              Suivez-nous
            </h3>
            <div class="site-footer__socials">
              <a href="https://www.facebook.com" target="_blank" rel="noopener">
                <i data-feather="facebook" class="w-4 h-4"></i>
                Facebook
              </a>
              <a href="https://www.instagram.com" target="_blank" rel="noopener">
                <i data-feather="instagram" class="w-4 h-4"></i>
                Instagram
              </a>
              <a href="https://www.youtube.com" target="_blank" rel="noopener">
                <i data-feather="youtube" class="w-4 h-4"></i>
                YouTube
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener">
                <i data-feather="twitter" class="w-4 h-4"></i>
                Twitter
              </a>
            </div>
          </div>
        </div>
        <div class="site-footer__bottom">
          <p>&copy; {{ currentYear }} EDIG - Tous droits réservés | Institut Pédagogique National du Gabon</p>
        </div>
      </footer>
    </div>
  `,
  styles: [
    `:host{display:block}
    .page-shell{min-height:100vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#fdf7ec 0%,#eef2ff 50%,#f8fafc 100%);position:relative;overflow:visible}
    .page-shell__grid-background{position:fixed;top:0;left:0;right:0;bottom:0;width:100vw;height:100vh;background-image:linear-gradient(to right,rgba(14,165,233,0.22) 1.2px,transparent 1.2px),linear-gradient(to bottom,rgba(14,165,233,0.22) 1.2px,transparent 1.2px);background-size:50px 50px;background-position:0 0;opacity:0.75;pointer-events:none;z-index:0}
    .site-header{position:sticky;top:0;z-index:30;background:linear-gradient(135deg,#e0f2fe 0%,#bae6fd 30%,#7dd3fc 60%,#bae6fd 90%,#e0f2fe 100%);backdrop-filter:blur(20px);border-bottom:3px solid rgba(14,165,233,.4);box-shadow:0 8px 24px rgba(14,165,233,.2),0 2px 8px rgba(14,165,233,.15);transition:all .3s ease}
    .site-header::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#0ea5e9 0%,#38bdf8 25%,#6366f1 50%,#8b5cf6 75%,#0ea5e9 100%);background-size:200% 100%;animation:headerGradient 8s linear infinite}
    @keyframes headerGradient{0%{background-position:0% 50%}100%{background-position:200% 50%}}
    .site-header__inner{max-width:1400px;margin:0 auto;padding:1.25rem 2rem;display:flex;align-items:center;justify-content:space-between;gap:2rem;position:relative;z-index:1}
    .site-logo{font-size:1.75rem;font-weight:900;letter-spacing:.1em;background:linear-gradient(135deg,#0369a1,#0c4a6e);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-decoration:none;transition:transform .3s ease;filter:drop-shadow(0 2px 4px rgba(3,105,161,.3));flex-shrink:0;white-space:nowrap}
    .site-logo:hover{transform:scale(1.05);filter:drop-shadow(0 4px 8px rgba(3,105,161,.4))}
    .site-nav{display:flex;align-items:center;justify-content:center;gap:1.5rem;flex:1;max-width:600px;margin:0 auto}
    .site-nav__link{font-size:.95rem;font-weight:600;color:#0c4a6e;text-decoration:none;transition:all .3s ease;padding:.6rem 1rem;border-radius:.6rem;position:relative;background:rgba(255,255,255,.4);border:1px solid rgba(14,165,233,.2);box-shadow:0 2px 4px rgba(14,165,233,.1)}
    .site-nav__link::after{content:'';position:absolute;bottom:0;left:50%;width:0;height:3px;background:linear-gradient(90deg,#0369a1,#0c4a6e);transition:all .3s ease;transform:translateX(-50%);border-radius:2px}
    .site-nav__link--active{color:#ffffff;background:linear-gradient(135deg,#0ea5e9,#0284c7);border-color:#0284c7;box-shadow:0 4px 12px rgba(14,165,233,.3)}
    .site-nav__link:hover{color:#ffffff;background:linear-gradient(135deg,#0ea5e9,#0284c7);border-color:#0284c7;box-shadow:0 4px 12px rgba(14,165,233,.3);transform:translateY(-2px)}
    .site-nav__link:hover::after{width:0}
    .site-actions{display:flex;align-items:center;gap:.75rem;flex-shrink:0;margin-left:auto}
    .site-actions__link{font-size:.95rem;font-weight:600;color:#0c4a6e;text-decoration:none;padding:.65rem 1.4rem;border-radius:.6rem;transition:all .3s ease;background:rgba(255,255,255,.6);border:1.5px solid rgba(14,165,233,.35);box-shadow:0 2px 6px rgba(14,165,233,.15);white-space:nowrap}
    .site-actions__link:hover{color:#ffffff;background:linear-gradient(135deg,#0284c7,#0369a1);border-color:#0369a1;box-shadow:0 4px 12px rgba(14,165,233,.35);transform:translateY(-2px)}
    .site-actions__cta{display:inline-flex;align-items:center;padding:.75rem 1.75rem;border-radius:999px;background:linear-gradient(135deg,#0369a1,#0c4a6e);color:#ffffff;font-weight:700;font-size:.95rem;text-decoration:none;transition:all .3s ease;box-shadow:0 6px 16px rgba(3,105,161,.4),0 2px 4px rgba(3,105,161,.2);border:2px solid rgba(255,255,255,.3);white-space:nowrap}
    .site-actions__cta:hover{transform:translateY(-3px);box-shadow:0 8px 24px rgba(3,105,161,.5),0 4px 8px rgba(3,105,161,.3);background:linear-gradient(135deg,#0c4a6e,#075985)}
    .site-profile{display:flex;align-items:center;gap:.75rem;padding:.4rem .9rem;border-radius:999px;background:rgba(255,255,255,.7);border:2px solid rgba(14,165,233,.3);transition:all .3s ease;position:relative;box-shadow:0 2px 8px rgba(14,165,233,.15);backdrop-filter:blur(10px)}
    .site-profile:hover{background:rgba(255,255,255,.9);border-color:rgba(14,165,233,.5);box-shadow:0 4px 12px rgba(14,165,233,.25);transform:translateY(-1px)}
    .site-profile__avatar{width:2.25rem;height:2.25rem;border-radius:999px;object-fit:cover;border:2px solid rgba(99,102,241,.2)}
    .site-profile__info{display:flex;flex-direction:column}
    .site-profile__name{font-size:.875rem;font-weight:600;color:#1f2937;line-height:1.2}
    .profile-menu{position:absolute;right:0;top:calc(100% + .6rem);width:18.5rem;background:#fff;border:1px solid rgba(15,23,42,.06);border-radius:.75rem;box-shadow:0 18px 40px rgba(2,6,23,.12);overflow:hidden;z-index:50}
    .profile-menu__header{display:flex;gap:.75rem;align-items:center;padding:.9rem;border-bottom:1px solid rgba(15,23,42,.03)}
    .profile-menu__avatar{width:3rem;height:3rem;border-radius:999px;object-fit:cover;border:1px solid rgba(148,163,184,.12)}
    .profile-menu__meta{font-size:.9rem}
    .profile-menu__name{font-weight:700;color:#0f172a}
    .profile-menu__email{font-size:.85rem;color:#64748b}
    .profile-menu__list{list-style:none;margin:0;padding:.6rem;display:grid;gap:.4rem}
    .profile-menu__link{display:flex;align-items:center;gap:.6rem;text-decoration:none;color:#0f172a;padding:.55rem .7rem;border-radius:.5rem;font-weight:600}
    .profile-menu__link:hover{background:rgba(14,165,233,.06);color:#0369a1}
    .profile-menu__logout{width:100%;text-align:left;display:flex;gap:.6rem;align-items:center;padding:.55rem .7rem;border-radius:.5rem;border:none;background:transparent;color:#ef4444;font-weight:700;cursor:pointer}
    .profile-menu__logout:hover{background:rgba(239,68,68,.06)}
    @media(max-width:1024px){.site-header__inner{padding:1rem 1.5rem;gap:1.5rem}.site-nav{gap:1rem;max-width:500px}.site-nav__link{font-size:.9rem;padding:.5rem .85rem}.site-actions{gap:.5rem}.site-actions__link{font-size:.9rem;padding:.6rem 1.2rem}.site-actions__cta{font-size:.9rem;padding:.65rem 1.5rem}}
    @media(max-width:768px){.site-header__inner{flex-wrap:wrap;justify-content:space-between;padding:1rem 1.25rem;gap:1rem}.site-logo{font-size:1.5rem}.site-nav{width:100%;order:3;flex-wrap:wrap;justify-content:center;max-width:100%;gap:.75rem}.site-nav__link{font-size:.875rem;padding:.4rem .6rem}.site-actions{order:2}.site-logo{font-size:1.3rem}}
    .hero{padding:clamp(2.5rem,6vw,4rem) 1.5rem;position:relative;z-index:1}
    .hero__inner{max-width:1140px;margin:0 auto;display:grid;gap:2.2rem;align-items:center}
    @media(min-width:960px){.hero__inner{grid-template-columns:1.1fr .9fr}}
    .badge{display:inline-flex;gap:.5rem;padding:.5rem 1.1rem;border-radius:999px;background:rgba(245,158,11,.1);color:#b45309;font-weight:700;letter-spacing:.12em;text-transform:uppercase;font-size:.75rem}
    .hero__content h1{font-size:clamp(1.8rem,3.2vw,2.4rem);color:#0f172a;line-height:1.15}
    .hero__content p{margin-top:1rem;color:#475569;max-width:36rem}
    .btn{display:inline-flex;align-items:center;justify-content:center;padding:.7rem 1.3rem;border-radius:999px;font-weight:600;text-decoration:none}
    .btn--primary{margin-top:1.2rem;background:linear-gradient(120deg,#f97316,#facc15);color:#1f2937;box-shadow:0 18px 38px -20px rgba(249,115,22,.5)}
    .hero__visual{position:relative;min-height:12rem}
    .visual-bubble{position:absolute;border-radius:999px;filter:blur(0);opacity:.7}
    .visual-bubble--amber{width:12rem;height:12rem;top:-1rem;right:10%;background:radial-gradient(circle,rgba(245,158,11,.35) 0%, rgba(255,255,255,0) 70%)}
    .visual-bubble--indigo{width:9rem;height:9rem;bottom:-1rem;left:15%;background:radial-gradient(circle,rgba(99,102,241,.32) 0%, rgba(255,255,255,0) 70%)}
    .list{padding:0 1.5rem 2.5rem;position:relative;z-index:1}
    .list__inner{max-width:1140px;margin:0 auto}
    .cards{display:grid;gap:1.2rem;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
    .card{background:#fff;border:1px solid rgba(148,163,184,.22);border-radius:1.25rem;overflow:hidden;box-shadow:0 20px 40px -32px rgba(15,23,42,.32);display:flex;flex-direction:column;transition:transform .3s ease,box-shadow .3s ease;min-height:100%}
    .card:hover{transform:translateY(-4px);box-shadow:0 28px 50px -30px rgba(15,23,42,.4)}
    .card__image{width:100%;aspect-ratio:4/3;background-size:cover;background-position:center;position:relative}
    .card__body{padding:1.1rem 1.35rem 1.4rem;display:flex;flex-direction:column;gap:.65rem}
    .card__tag{align-self:flex-start;display:inline-flex;padding:.25rem .6rem;border-radius:.6rem;font-size:.72rem;font-weight:700;background:rgba(245,158,11,.15);color:#c2410c}
    .card__title{font-size:1.05rem;color:#0f172a;margin:0}
    .card__meta{font-size:.85rem;color:#64748b;margin:0}
    .card__desc{font-size:.92rem;color:#475569;margin:0;line-height:1.45}
    .card__link{margin-top:auto;align-self:flex-start;padding:.45rem 1.2rem;border-radius:999px;background:#111827;color:#fff;font-size:.85rem;font-weight:600;text-decoration:none;transition:background .3s ease,transform .3s ease}
    .card__link:hover{background:#0f172a;transform:translateY(-1px)}
    .cards--skeleton .card{pointer-events:none;border:1px solid rgba(148,163,184,.15);background:rgba(255,255,255,.8)}
    .skeleton-card__image{width:100%;aspect-ratio:4/3;background:linear-gradient(120deg,rgba(226,232,240,.6),rgba(203,213,225,.4),rgba(226,232,240,.6));background-size:200% 200%;animation:skeleton 1.6s ease-in-out infinite}
    .skeleton-card__body{padding:1rem 1.35rem 1.2rem;display:grid;gap:.6rem}
    .skeleton-line{height:.8rem;border-radius:.6rem;background:linear-gradient(120deg,rgba(226,232,240,.6),rgba(203,213,225,.4),rgba(226,232,240,.6));background-size:200% 200%;animation:skeleton 1.6s ease-in-out infinite}
    .skeleton-line--short{width:35%}
    .skeleton-line--medium{width:60%}
    .skeleton-line--long{width:90%}
    @keyframes skeleton{0%{background-position:100% 0}100%{background-position:-100% 0}}
    .empty-state{padding:3rem 2rem;text-align:center;border-radius:1.5rem;background:linear-gradient(135deg,rgba(245,158,11,.08),rgba(14,165,233,.08));color:#475569;border:1px dashed rgba(245,158,11,.3)}
    .empty-state h3{font-size:1.2rem;color:#0f172a;margin-bottom:.5rem}
    .site-footer{background:linear-gradient(135deg,#1e293b 0%,#0f172a 50%,#020617 100%);color:#e2e8f0;padding:3.5rem 1.5rem 2rem;margin-top:4rem;position:relative;overflow:hidden}
    .site-footer::before{content:'';position:absolute;top:0;left:0;right:0;height:4px;background:linear-gradient(90deg,#f59e0b 0%,#fbbf24 25%,#38bdf8 50%,#6366f1 75%,#f97316 100%)}
    .site-footer::after{content:'';position:absolute;top:-50px;right:-50px;width:200px;height:200px;background:radial-gradient(circle,rgba(99,102,241,.15) 0%,transparent 70%);border-radius:50%;pointer-events:none}
    .site-footer__inner{max-width:1200px;margin:0 auto;display:grid;gap:2.5rem;position:relative;z-index:1}
    @media(min-width:768px){.site-footer__inner{grid-template-columns:1.5fr 1fr 1fr;gap:3rem}}
    .site-footer__brand{display:flex;flex-direction:column;gap:1rem}
    .site-footer__brand .site-logo{font-size:1.8rem;font-weight:800;letter-spacing:.1em;background:linear-gradient(135deg,#38bdf8,#6366f1);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;text-decoration:none}
    .site-footer__brand p{color:#cbd5e1;font-size:.95rem;line-height:1.6;margin-top:.75rem;max-width:320px}
    .site-footer__section{display:flex;flex-direction:column;gap:1rem}
    .site-footer__section-title{font-size:1rem;font-weight:700;color:#fff;text-transform:uppercase;letter-spacing:.05em;display:inline-flex;align-items:center;gap:.5rem}
    .site-footer__links,.site-footer__socials{display:flex;flex-direction:column;gap:.8rem}
    .site-footer__links a,.site-footer__socials a{color:#cbd5e1;font-weight:500;text-decoration:none;font-size:.95rem;transition:all .3s ease;display:inline-flex;align-items:center;gap:.5rem;padding:.3rem 0}
    .site-footer__links a:hover,.site-footer__socials a:hover{color:#38bdf8;transform:translateX(5px)}
    .site-footer__links a::before{content:'→';opacity:0;transition:opacity .3s ease}
    .site-footer__links a:hover::before{opacity:1}
    .site-footer__school-icons{display:flex;gap:1rem;margin-top:1.5rem;flex-wrap:wrap}
    .school-icon{width:48px;height:48px;border-radius:12px;display:flex;align-items:center;justify-content:center;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);transition:all .3s ease;cursor:pointer}
    .school-icon:hover{background:rgba(99,102,241,.15);border-color:rgba(99,102,241,.3);transform:translateY(-3px)}
    .site-footer__bottom{margin-top:2.5rem;padding-top:1.5rem;border-top:1px solid rgba(148,163,184,.2);text-align:center;color:#94a3b8;font-size:.85rem}
    `,
  ],
  imports: [CommonModule, RouterModule],
})
export class NouveautesComponent implements OnInit, AfterViewInit, OnDestroy {
  readonly fallbackImage = 'https://images.unsplash.com/photo-1509062522246-3755977927d7?auto=format&fit=crop&w=600&q=80';
  readonly skeletonItems = Array.from({ length: 6 }, (_, index) => index);
  isLoading = true;
  manuals: Manual[] = [];
  filteredManuals: Manual[] = [];
  levels: Level[] = [];
  subjects: string[] = [];

  selectedLevel: string | null = null;
  selectedSubject: string | null = null;
  searchTerm = '';
  sortOption: SortOption = 'recent';

  selectedManual: Manual | null = null;
  isModalVisible = false;

  showProfileMenu = false;
  user: User | null = null;
  userName = '';
  userEmail = '';
  userAvatar = '';
  private authSubscription: any;
  currentYear = new Date().getFullYear();

  constructor(private supabaseService: SupabaseService, private router: Router) {}

  async ngOnInit(): Promise<void> {
    await Promise.all([this.loadNewManuals(), this.loadLevels()]);
    this.updateDerivedData();
    await this.loadUser();
    this.isLoading = false;
    this.refreshFeatherIcons();
    this.authSubscription = this.supabaseService.supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
        await this.loadUser();
      }
    });
  }

  ngAfterViewInit(): void {
    this.refreshFeatherIcons();
  }

  ngOnDestroy(): void {
    if (this.authSubscription) {
      try { this.authSubscription.data.subscription.unsubscribe(); } catch { /* ignore */ }
    }
  }

  toggleProfileMenu(): void {
    this.showProfileMenu = !this.showProfileMenu;
    if (this.showProfileMenu) {
      this.refreshFeatherIcons();
    }
  }

  goToAccount(): void {
    this.showProfileMenu = false;
    this.router.navigate(['/bibliotheque/compte']);
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(_event: MouseEvent): void {
    if (this.showProfileMenu) {
      this.showProfileMenu = false;
    }
  }

  private async loadUser(): Promise<void> {
    this.user = await this.supabaseService.getUser();
    if (this.user) {
      const metadata = (this.user as any).user_metadata || {};
      this.userName = metadata['full_name'] || metadata['name'] || this.user.email?.split('@')[0] || 'Utilisateur';
      this.userEmail = this.user.email || '';
      this.userAvatar = metadata['avatar_url'] || metadata['picture'] || this.getDefaultAvatar(this.userName, this.userEmail);
    } else {
      this.userName = '';
      this.userEmail = '';
      this.userAvatar = '';
    }
  }

  private getDefaultAvatar(name: string, email: string): string {
    const displayName = encodeURIComponent(name || email || 'User');
    return `https://ui-avatars.com/api/?name=${displayName}&background=6366f1&color=fff&size=128`;
  }

  async logout(): Promise<void> {
    this.showProfileMenu = false;
    try {
      await this.supabaseService.supabase.auth.signOut();
    } catch (err) {
      console.warn('Erreur de déconnexion :', err);
    } finally {
      this.resetUserState();
      this.router.navigate(['/bibliotheque']);
    }
  }

  private resetUserState(): void {
    this.user = null;
    this.userName = '';
    this.userEmail = '';
    this.userAvatar = '';
  }

  trackByManualId(_index: number, manual: Manual): string { return manual.id; }

  getLevelName(levelId: string | null | undefined): string {
    if (!levelId) return 'Niveau non défini';
    return this.levels.find((l) => l.id === levelId)?.name ?? 'Niveau non défini';
  }

  setLevel(levelId: string | null): void { this.selectedLevel = levelId; this.updateDerivedData(); }
  setSubject(subject: string | null): void { this.selectedSubject = subject; this.updateDerivedData(); }
  setSort(option: SortOption): void { this.sortOption = option; this.updateDerivedData(); }
  handleSearchTermChange(term: string): void { this.searchTerm = term; this.updateDerivedData(); }

  openManual(manual: Manual): void { this.selectedManual = manual; this.isModalVisible = true; }
  closeModal(): void { this.isModalVisible = false; this.selectedManual = null; }

  private async loadNewManuals(): Promise<void> {
    try {
      const { data, error } = await this.supabaseService.supabase
        .from('manuals')
        .select('id,title,author,publisher,subject,description,image_url,level_id,is_new,is_popular,created_at')
        .or('is_new.eq.true,is_new.eq.1')
        .order('created_at', { ascending: false })
        .limit(24);

      if (error) { console.error('Erreur chargement nouveautés :', error); this.manuals = []; return; }

      this.manuals = (data ?? []).map((manual: any) => ({
        id: manual.id,
        title: manual.title ?? 'Manuel sans titre',
        author: manual.author ?? 'Auteur non renseigné',
        publisher: manual.publisher ?? null,
        subject: manual.subject ?? null,
        description: manual.description ?? null,
        image_url: manual.image_url ?? null,
        level_id: manual.level_id ?? null,
        is_new: this.normalizeFlag(manual.is_new, 'nouveau'),
        is_popular: this.normalizeFlag(manual.is_popular, 'populaire'),
        created_at: manual.created_at ?? new Date().toISOString(),
      }));

      this.subjects = Array.from(new Set(
        this.manuals
          .map((m) => (m.subject ?? '').trim())
          .filter((s) => s)
          .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      )).sort((a, b) => a.localeCompare(b, 'fr', { sensitivity: 'base' }));
    } catch (err) {
      console.error('Erreur inattendue lors du chargement des nouveautés :', err);
      this.manuals = [];
    }
  }

  private normalizeFlag(value: any, keyword: string): boolean {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'number') return value === 1;
    if (typeof value === 'string') {
      const normalized = value.trim().toLowerCase();
      if (normalized === 'true' || normalized === '1' || normalized === keyword) return true;
    }
    return false;
  }

  getCardBackground(manual: Manual): string {
    const trimmed = manual.image_url?.trim();
    const source = trimmed ? trimmed : this.fallbackImage;
    const safe = encodeURI(source);
    return `url('${safe}')`;
  }

  private async loadLevels(): Promise<void> {
    try {
      const levels = await this.supabaseService.getLevels();
      this.levels = (levels ?? []).sort((a, b) => a.name.localeCompare(b.name, 'fr', { sensitivity: 'base' }));
    } catch (err) {
      console.error('Erreur lors du chargement des niveaux :', err);
      this.levels = [];
    }
  }

  private updateDerivedData(): void {
    const term = this.searchTerm.trim().toLowerCase();
    let manuals = [...this.manuals];

    if (this.selectedLevel) manuals = manuals.filter((m) => m.level_id === this.selectedLevel);
    if (this.selectedSubject) {
      const s = this.selectedSubject.trim().toLowerCase();
      manuals = manuals.filter((m) => (m.subject ?? '').trim().toLowerCase() === s);
    }
    if (term) {
      manuals = manuals.filter((m) => [m.title, m.author, m.publisher, m.subject, m.description]
        .map((v) => (v ?? '').toLowerCase()).join(' ').includes(term));
    }

    this.filteredManuals = this.sortManuals(manuals, this.sortOption);
  }

  private sortManuals(manuals: Manual[], option: SortOption): Manual[] {
    const sorted = [...manuals];
    switch (option) {
      case 'alphabetical':
        return sorted.sort((a, b) => (a.title ?? '').localeCompare(b.title ?? '', 'fr', { sensitivity: 'base' }));
      case 'popular':
        return sorted.sort((a, b) => Number(!!b.is_popular) - Number(!!a.is_popular));
      case 'recent':
      default:
        return sorted.sort((a, b) => (new Date(b.created_at).getTime()) - (new Date(a.created_at).getTime()));
    }
  }

  private refreshFeatherIcons(): void {
    setTimeout(() => { try { (window as any).feather?.replace(); } catch { /* ignore */ } }, 0);
  }
}


