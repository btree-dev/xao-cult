import type { NextPage } from 'next';
import Head from 'next/head';
import { useState, useEffect, useRef, useMemo } from 'react';
import { useRouter } from 'next/router';

import styles from '../styles/Home.module.css';
import { supabase } from '../lib/supabase';
import Navbar from '../components/Navbar';
import Layout from '../components/Layout';
import Scrollbar from '../components/Scrollbar';
import ShareModal from '../components/ShareModal';
import CalendarFilter, { FilterOptions, LocationFilterData } from '../components/CalendarFilter';
import { useWeb3 } from '../hooks/useWeb3';
import { useAllContractsWithSummaries, ContractSummary, CONTRACT_STATUS_LABELS, formatContractDate } from '../hooks/useGetContracts';
import { DEFAULT_CHAIN } from '../lib/web3/chains';
import {
  getStoredLocationFilter,
  getStoredDateFilters,
  applyContractFilters
} from '../backend/services/dashboardHelpers';

const Dashboard: NextPage = () => {
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filteredContracts, setFilteredContracts] = useState<ContractSummary[]>([]);
  const [mutedEvents, setMutedEvents] = useState<Set<string>>(new Set());
  const [likedEvents, setLikedEvents] = useState<Set<string>>(new Set());
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<any>(null);
  const [calendarFilterOpen, setCalendarFilterOpen] = useState(false);
  const [filterLocation, setFilterLocation] = useState<LocationFilterData>({ name: '', coordinates: null });
  const [dateFilters, setDateFilters] = useState<FilterOptions | null>(null);
  const [filtersLoaded, setFiltersLoaded] = useState(false);

  // Web3 hooks for blockchain contracts
  const { address, isConnected, chain } = useWeb3();
  const { contracts: rawContracts, isLoading: contractsLoading, refetch: refetchContracts } = useAllContractsWithSummaries(chain?.id || DEFAULT_CHAIN);

  // Stabilize contracts reference to prevent useEffect re-runs on every wagmi refetch
  const contractsRef = useRef<string>('');
  const contracts = useMemo(() => {
    const key = JSON.stringify(rawContracts.map(c => c.contractAddress));
    if (key !== contractsRef.current) {
      contractsRef.current = key;
      return rawContracts;
    }
    return rawContracts;
  }, [rawContracts]);

  // Load filters from sessionStorage on mount
  useEffect(() => {
    const storedLocation = getStoredLocationFilter();
    const storedDateFilters = getStoredDateFilters();

    if (storedLocation.coordinates || storedLocation.name) {
      setFilterLocation(storedLocation);
    }
    if (storedDateFilters) {
      setDateFilters(storedDateFilters);
    }
    setFiltersLoaded(true);
  }, []);

  // Save filters to sessionStorage when they change
  useEffect(() => {
    if (filtersLoaded) {
      sessionStorage.setItem('locationFilter', JSON.stringify(filterLocation));
    }
  }, [filterLocation, filtersLoaded]);

  useEffect(() => {
    if (filtersLoaded) {
      sessionStorage.setItem('dateFilters', JSON.stringify(dateFilters));
    }
  }, [dateFilters, filtersLoaded]);

  const router = useRouter();

  const toggleMute = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setMutedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };


  const toggleLike = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setLikedEvents(prev => {
      const newSet = new Set(prev);
      if (newSet.has(eventId)) {
        newSet.delete(eventId);
      } else {
        newSet.add(eventId);
      }
      return newSet;
    });
  };


  const handleShare = (event: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedEvent(event);
    setShareModalOpen(true);
  };

  const closeShareModal = () => {
    setShareModalOpen(false);
    setSelectedEvent(null);
  };

  // Handle calendar filter - save filters and trigger combined filtering
  const handleApplyFilters = (filters: FilterOptions) => {
    setDateFilters(filters);
    // If reset (empty filters), clear from sessionStorage
    if (!filters.startDate && !filters.endDate && filters.selectedGenres.length === 0) {
      sessionStorage.removeItem('dateFilters');
    }
  };

  // Handle location filter
  const handleApplyLocationFilter = (location: LocationFilterData) => {
    setFilterLocation(location);
    // If reset (empty location), clear from sessionStorage
    if (!location.name && !location.coordinates) {
      sessionStorage.removeItem('locationFilter');
    }
  };

  // Combined filter effect - applies both date and location filters to blockchain contracts
  // Uses a debounce to avoid rapid re-runs from cascading state changes
  useEffect(() => {
    if (!contracts || contracts.length === 0) return;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const filtered = await applyContractFilters(contracts, dateFilters, filterLocation, profile);
      if (!cancelled) {
        setFilteredContracts(filtered);
      }
    }, 100);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [filterLocation, dateFilters, contracts, profile]);

  useEffect(() => {
    const getUser = async () => {
      setLoading(true);

      try {
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
          router.push('/');
          return;
        }

        setUser(user);

        let profileData = null;

        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (!error) {
            profileData = data;
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
        }

        if (!profileData) {
          router.push('/create-profile');
          return;
        } else {
          setProfile(profileData);
        }
      } catch (error) {
        console.error('Error in dashboard:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    getUser();
  }, [router]);


  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.background} />
        <div className={styles.loadingContainer}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Layout>
      <div className={styles.dashboardContainer}>
      <div className={styles.background} />
      <Head>
        <title>Dashboard - XAO Cult</title>
        <meta content="Dashboard - XAO Cult" name="description" />
        <link href="/favicon.ico" rel="icon" />
      </Head>

      <Navbar
        userProfile={{
          username: profile?.username,
          avatar: profile?.profile_picture_url || '/profileIcon.svg'
        }}
        showNotificationIcon={true}
        showSearchIcon={false}
        onCalendarClick={() => setCalendarFilterOpen(true)}
        selectedStartDate={dateFilters?.startDate}
      />
      <Scrollbar />

      <CalendarFilter
        isOpen={calendarFilterOpen}
        onClose={() => setCalendarFilterOpen(false)}
        onApplyFilters={handleApplyFilters}
        onApplyLocationFilter={handleApplyLocationFilter}
        currentLocationFilter={filterLocation}
      />

        <div className={styles.walletCardContainer}>
        <div
          className={styles.walletCard}
          style={{
            background: 'linear-gradient(135deg, #FF8A00 0%, #FF5F6D 50%, #A557FF 100%)'
          }}
        >
          <div className={styles.walletCardHeader}>
            <span className={styles.walletUsername}>@{profile?.username || 'yevhenii_d'}</span>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <img src="/usdc-logo.svg" alt="USDC" />
              </div>
              <span className={styles.walletCurrencyName}>USDC</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>13,246.22</span>
              <span className={styles.walletCurrencyUsd}>(13,246.22 usd)</span>
            </div>
          </div>
          <div className={styles.walletCurrencyRow}>
            <div className={styles.walletCurrencyLeft}>
              <div className={styles.walletCurrencyLogo}>
                <img src="/xao-logo.svg" alt="XAO" />
              </div>
              <span className={styles.walletCurrencyName}>XAO</span>
            </div>
            <div className={styles.walletCurrencyRight}>
              <span className={styles.walletCurrencyValue}>1,280.99</span>
              <span className={styles.walletCurrencyUsd}>(500,000 usd)</span>
            </div>
          </div>
        </div>
      </div>

        {/* Blockchain Contracts — filtered and sorted */}
        <div className={styles.feedContainer}>
          {filteredContracts.map((contract, index) => (
            <div
              key={contract.contractAddress || index}
              className={styles.feedItem}
              onClick={() => router.push(`/event/${contract.contractAddress}`)}
            >
              <div className={styles.feedHeader}>
                <div className={styles.feedAuthor}>
                  <div className={styles.authorAvatar}>
                    <img
                      src="/profileIcon.svg"
                      alt={contract.eventName || 'Contract'}
                    />
                  </div>
                  <div className={styles.authorName}>@{contract.eventName || 'Contract'}</div>
                  <div className={styles.headerTag}>
                    {CONTRACT_STATUS_LABELS[contract.status] || 'Unknown'}
                  </div>
                </div>
              </div>
              <div className={styles.feedContent}>
                {contract.eventImageUri && (
                  <img
                    src={contract.eventImageUri}
                    alt={contract.eventName || 'Contract'}
                    className={styles.feedImage}
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                )}
                <div className={styles.feedContentOverlayTop}>
                  <h2 className={styles.feedEventTitle}>{contract.eventName || 'Untitled Contract'}</h2>
                  <div className={styles.feedEventLocation}>
                    <img src="/Map_Pin.svg" alt="Location" className={styles.locationIcon} />
                    <span>{contract.venueName || 'No venue specified'}</span>
                  </div>
                  <div className={styles.feedEventDate}>
                    <img src="/Calendar_Days.svg" alt="Date" className={styles.dateIcon} />
                    <span>{formatContractDate(contract.showDate)}</span>
                  </div>
                </div>
              </div>
              <div className={styles.feedActionsBottom}>
                <div className={styles.actionButton} onClick={(e) => handleShare({ id: contract.contractAddress, title: contract.eventName || 'Contract' }, e)}>
                  <img src="/Paper_Plane.svg" alt="Share" className={styles.contractIconSvg} />
                  <span className={styles.actionCounter}>0</span>
                </div>
                <div className={styles.actionButton} onClick={(e) => toggleLike(contract.contractAddress, e)}>
                  <svg width="24" height="24" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                    <path
                      d="M12 7.69431C10 2.99988 3 3.49988 3 9.49991C3 15.4999 12 20.5001 12 20.5001C12 20.5001 21 15.4999 21 9.49991C21 3.49988 14 2.99988 12 7.69431Z"
                      fill={likedEvents.has(contract.contractAddress) ? "#DC143C" : "none"}
                      stroke={likedEvents.has(contract.contractAddress) ? "#DC143C" : "white"}
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className={styles.actionCounter}>{likedEvents.has(contract.contractAddress) ? 1 : 0}</span>
                </div>
                <div className={styles.actionButton} onClick={(e) => toggleMute(contract.contractAddress, e)}>
                  {mutedEvents.has(contract.contractAddress) ? (
                    <img src="/Volume_Off_02.png" alt="Muted" className={styles.contractIconSvg} />
                  ) : (
                    <img src="/Volume.svg" alt="Volume" className={styles.contractIconSvg} />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <ShareModal
          isOpen={shareModalOpen}
          onClose={closeShareModal}
          eventTitle={selectedEvent?.title || ''}
          eventUrl={`/event/${selectedEvent?.id || ''}`}
        />
      </div>
    </Layout>
  );
};

export default Dashboard;
