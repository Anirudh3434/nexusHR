const API_URL = '/api/attendance';

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  date: string;
  status: 'Present' | 'Absent' | 'On Leave' | 'Half Day' | 'Late' | 'On Time' | 'Holiday';
  checkIn?: { time: string; ip?: string; location?: { lat: number; lng: number } };
  checkOut?: { time: string; ip?: string; location?: { lat: number; lng: number } };
  workMode?: 'office' | 'wfh';
  isLate?: boolean;
  lateMinutes?: number;
  shiftStartTime?: string;
  shiftEndTime?: string;
  workShiftId?: string;
  totalHours?: number;
  isOvertime?: boolean;
  overtimeMinutes?: number;
  overtimeHours?: number;
  note?: string;
}

export interface AttendanceInput {
  employeeId: string;
  employeeName?: string;
  date: string;
  status?: string;
  checkIn?: string;
  checkOut?: string;
  companyId?: string;
  workMode?: 'office' | 'wfh';
  note?: string;
  location?: { lat: number; lng: number };
}

export interface AttendanceResponse {
  message: string;
  id: string;
  isLate?: boolean;
  lateMinutes?: number;
  status?: string;
  isOvertime?: boolean;
  overtimeHours?: number;
  overtimeMinutes?: number;
}

export const getAttendance = async (params?: { employeeId?: string; companyId?: string; date?: string }): Promise<AttendanceRecord[]> => {
  const url = new URL(API_URL, window.location.origin);
  if (params?.employeeId) url.searchParams.append('employeeId', params.employeeId);
  if (params?.companyId) url.searchParams.append('companyId', params.companyId);
  if (params?.date) url.searchParams.append('date', params.date);
  
  const response = await fetch(url.toString());
  if (!response.ok) {
    throw new Error('Failed to fetch attendance');
  }
  return response.json();
};

// Helper: Get current location
const getCurrentLocation = (): Promise<{ coords: { lat: number; lng: number } | null, error: string | null }> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      resolve({ coords: null, error: 'NOT_SUPPORTED' });
      return;
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          coords: {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          },
          error: null
        });
      },
      (error) => {
        let errorCode = 'UNKNOWN_ERROR';
        if (error.code === error.PERMISSION_DENIED) errorCode = 'PERMISSION_DENIED';
        else if (error.code === error.POSITION_UNAVAILABLE) errorCode = 'POSITION_UNAVAILABLE';
        else if (error.code === error.TIMEOUT) errorCode = 'TIMEOUT';
        resolve({ coords: null, error: errorCode });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
};

export const logAttendance = async (data: AttendanceInput): Promise<AttendanceResponse> => {
  // Get current location if checking in/out
  let location = data.location;
  if (!location && (data.checkIn || data.checkOut)) {
    const locResult = await getCurrentLocation();
    if (locResult.coords) {
      location = locResult.coords;
    } else if (locResult.error === 'PERMISSION_DENIED' && data.workMode !== 'wfh') {
      // If permission denied and they are trying to check in to office, we can throw early
      // but we still call the API to let the backend handle the strictness/policy
    }
  }
  
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ...data, location }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to log attendance');
  }
  return response.json();
};

// Get today's attendance for an employee
export const getTodayAttendance = async (employeeId: string): Promise<AttendanceRecord | null> => {
  const today = new Date().toISOString().split('T')[0];
  const records = await getAttendance({ employeeId, date: today });
  return records.length > 0 ? records[0] : null;
};

// Update attendance record (Admin/HR)
export const updateAttendanceRecord = async (id: string, data: Partial<AttendanceInput & { status?: string }>): Promise<AttendanceResponse> => {
  const response = await fetch(API_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ id, ...data }),
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to update attendance');
  }
  return response.json();
};

// Delete attendance record (Admin/HR)
export const deleteAttendanceRecord = async (id: string): Promise<void> => {
  const response = await fetch(`${API_URL}?id=${id}`, {
    method: 'DELETE',
  });
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.error || 'Failed to delete attendance');
  }
};
