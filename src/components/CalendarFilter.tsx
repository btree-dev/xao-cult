import React, { useState } from 'react';
import styles from './CalendarFilter.module.css';
import { Genres } from '../backend/public-information-services/publicinfodata';

interface CalendarFilterProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyFilters: (filters: FilterOptions) => void;
}

export interface FilterOptions {
  startDate: string;
  endDate: string;
  sortBy: ('date' | 'genre' | 'location' | 'distance')[];
  selectedGenres: string[];
}

const CalendarFilter: React.FC<CalendarFilterProps> = ({ isOpen, onClose, onApplyFilters }) => {
  const today = new Date().toISOString().split('T')[0];

  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [sortBy, setSortBy] = useState<('date' | 'genre' | 'location' | 'distance')[]>(['date']);
  const [selectedGenres, setSelectedGenres] = useState<string[]>([]);
  const [genreDropdownOpen, setGenreDropdownOpen] = useState(false);

  if (!isOpen) return null;

  const handleApply = () => {
    onApplyFilters({
      startDate,
      endDate,
      sortBy,
      selectedGenres
    });
    onClose();
  };

  const handleReset = () => {
    setStartDate('');
    setEndDate('');
    setSortBy(['date']);
    setSelectedGenres([]);
    setGenreDropdownOpen(false);
    onApplyFilters({
      startDate: '',
      endDate: '',
      sortBy: ['date'],
      selectedGenres: []
    });
    onClose();
  };

  const toggleSortBy = (option: 'date' | 'genre' | 'location' | 'distance') => {
    setSortBy(prev => {
      if (prev.includes(option)) {
        // If it's the only option selected, keep it selected
        if (prev.length === 1) return prev;
        return prev.filter(item => item !== option);
      } else {
        return [...prev, option];
      }
    });
  };

  const toggleGenre = (genre: string) => {
    setSelectedGenres(prev => {
      if (prev.includes(genre)) {
        return prev.filter(g => g !== genre);
      } else {
        return [...prev, genre];
      }
    });
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <h2 className={styles.title}>Filter Events</h2>
          <button className={styles.closeButton} onClick={onClose}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M6 6L18 18" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className={styles.content}>
         
          <div className={styles.section}>
            <label className={styles.sectionLabel}>Search by Date Range</label>
            <div className={styles.dateInputWrapper}>
              <label className={styles.dateLabel}>Start Date</label>
              <input
                type="date"
                value={startDate}
                min={today}
                onChange={(e) => setStartDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
            <div className={styles.dateInputWrapper}>
              <label className={styles.dateLabel}>End Date</label>
              <input
                type="date"
                value={endDate}
                min={startDate || today}
                onChange={(e) => setEndDate(e.target.value)}
                className={styles.dateInput}
              />
            </div>
          </div>

          <div className={styles.section}>
            <label className={styles.sectionLabel}>Sort By</label>
            <div className={styles.sortOptions}>
              <button
                className={`${styles.sortButton} ${sortBy.includes('date') ? styles.active : ''}`}
                onClick={() => toggleSortBy('date')}
              >
                Date
              </button>
              <div className={styles.genreButtonWrapper}>
                <button
                  className={`${styles.sortButton} ${sortBy.includes('genre') || selectedGenres.length > 0 ? styles.active : ''}`}
                  onClick={() => {
                    
                    toggleSortBy('genre');
                    setGenreDropdownOpen(!genreDropdownOpen);
                  }}
                  type="button"
                >
                  Genre
                </button>
                {genreDropdownOpen && (
                  <div className={styles.genreDropdownMenu}>
                    {Genres.map((genre) => (
                      <label key={genre} className={styles.genreCheckboxLabel}>
                        <input
                          type="checkbox"
                          checked={selectedGenres.includes(genre)}
                          onChange={() => toggleGenre(genre)}
                          className={styles.genreCheckbox}
                        />
                        <span className={styles.genreCheckboxText}>{genre}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <button
                className={`${styles.sortButton} ${sortBy.includes('location') ? styles.active : ''}`}
                onClick={() => toggleSortBy('location')}
              >
                Location
              </button>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <button className={styles.resetButton} onClick={handleReset}>
            Reset
          </button>
          <button className={styles.applyButton} onClick={handleApply}>
            Apply
          </button>
        </div>
      </div>
    </div>
  );
};

export default CalendarFilter;
