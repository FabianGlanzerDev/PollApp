import { TestBed } from '@angular/core/testing';

import { Surveys } from './surveys';

describe('Surveys', () => {
  let service: Surveys;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Surveys);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
