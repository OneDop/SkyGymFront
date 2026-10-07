export interface PagedResult<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasNext: boolean;
  hasPrevious: boolean;
}

export type SortDir = 'asc' | 'desc';

export interface Studio {
  id: string;
  name: string;
  capacity: number;
}

export interface BranchSummary {
  id: string;
  name: string;
  opens: string;
  closes: string;
  studioCount: number;
}

export interface Branch {
  id: string;
  name: string;
  address: string | null;
  opens: string;
  closes: string;
  studios: Studio[];
}

export type MemberStatus = 'Active' | 'Frozen' | 'Pending' | 'Expired' | 'None';

export interface Member {
  id: string;
  membershipNumber: string;
  fullName: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  joinedDate: string;
  homeBranchId: string;
  branchName: string;
  status: MemberStatus;
  currentMembershipId: string | null;
  currentPlanName: string | null;
  membershipEndDate: string | null;
  freezesRemaining: number | null;
  freezeDaysRemaining: number | null;
  lastVisit: string | null;
}

export interface MemberActivity {
  type: 'CheckIn' | 'ClassAttendance';
  occurredAt: string;
  title: string;
  subtitle: string;
  admitted: boolean | null;
  refusalReason: string | null;
}

export type MembershipStatus = 'Pending' | 'Active' | 'Frozen' | 'Expired' | 'Cancelled';
export type FreezeReason = 'ExtendedTravel' | 'Medical' | 'Injury' | 'Financial' | 'Other';
export type AccessScope = 'HomeBranchOnly' | 'AllBranches';

export interface Freeze {
  id: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: FreezeReason;
  notes: string | null;
  requestedOn: string;
  isLifted: boolean;
}

export interface MembershipDetail {
  id: string;
  memberId: string;
  memberName: string;
  membershipNumber: string;
  planId: string;
  planName: string;
  purchaseDate: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  agreedTerms: {
    pricePaid: number;
    durationInMonths: number;
    maxFreezeDays: number;
    maxFreezeCount: number;
    guestPassQuota: number;
    accessScope: AccessScope;
  };
  freezeDaysUsed: number;
  freezeDaysRemaining: number;
  freezesUsed: number;
  freezesRemaining: number;
  guestPassesRemaining: number;
  freezes: Freeze[];
}

export interface MembershipSummary {
  id: string;
  planName: string;
  startDate: string;
  endDate: string;
  status: MembershipStatus;
  pricePaid: number;
}

export interface CheckInOutcome {
  checkInId: string;
  admitted: boolean;
  refusalReason: string | null;
  occurredAt: string;
}

export type SessionStatus = 'Open' | 'InProgress' | 'Completed' | 'Cancelled';

export interface ClassSession {
  id: string;
  className: string;
  branchId: string;
  branchName: string;
  studioId: string | null;
  studioName: string | null;
  trainerId: string | null;
  trainerName: string | null;
  sessionDate: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  capacityLimit: number;
  status: SessionStatus;
  description: string | null;
  confirmedCount: number;
  waitlistCount: number;
  placesRemaining: number;
}

export interface Booking {
  id: string;
  sessionId: string;
  memberId: string;
  bookedOn: string;
  status: 'Booked' | 'Waitlisted' | 'Attended' | 'NoShow' | 'Cancelled';
  waitlistPosition: number | null;
  notesForTrainer: string | null;
}

export interface DayCapacity {
  date: string;
  branchId: string | null;
  sessionsToday: number;
  totalBookings: number;
  capacityFillRatio: number;
}

export interface Trainer {
  id: string;
  trainerNumber: string;
  fullName: string;
  specialty: string | null;
  homeBranchId: string;
  branchName: string;
  email: string | null;
  phone: string | null;
  isActive: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  durationInMonths: number;
  maxFreezeDays: number;
  maxFreezeCount: number;
  guestPassQuota: number;
  accessScope: AccessScope;
  isPublished: boolean;
}

export interface PlanFilterOptions {
  durations: number[];
  minPrice: number;
  maxPrice: number;
}

export interface DashboardSummary {
  branchId: string | null;
  checkInsToday: number;
  checkInsLastWeek: number;
  checkInsChangePercent: number | null;
  activeMembers: number;
  frozenMembers: number;
  currentlyOnFloor: number;
}
