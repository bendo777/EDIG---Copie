import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AddBook } from './add-book';

describe('AddBook', () => {
  let component: AddBook;
  let fixture: ComponentFixture<AddBook>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AddBook]
    })
    .compileComponents();

    fixture = TestBed.createComponent(AddBook);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
