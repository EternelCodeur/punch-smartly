import React from 'react';
import { Calendar } from '@/components/ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CalendarDays, Clock, CheckCircle, XCircle } from 'lucide-react';

interface AttendanceDay {
  date: Date;
  status: 'present' | 'absent' | 'weekend';
  arrivalTime?: string;
  departureTime?: string;
  hoursWorked?: number;
  breaks?: { start: string; end: string; reason: string }[];
}

interface AttendanceCalendarProps {
  attendanceData: AttendanceDay[];
  month: Date;
  userName: string;
}

export const AttendanceCalendar: React.FC<AttendanceCalendarProps> = ({
  attendanceData,
  month,
  userName,
}) => {
  const totalHours = attendanceData
    .filter(day => day.status === 'present' && day.hoursWorked)
    .reduce((sum, day) => sum + (day.hoursWorked || 0), 0);

  const presentDays = attendanceData.filter(day => day.status === 'present').length;
  const absentDays = attendanceData.filter(day => day.status === 'absent').length;

  const getDayColor = (date: Date) => {
    const dayData = attendanceData.find(
      day => day.date.toDateString() === date.toDateString()
    );
    
    if (!dayData || dayData.status === 'weekend') {
      return '';
    }
    
    return dayData.status === 'present' 
      ? 'bg-success text-success-foreground hover:bg-success/90' 
      : 'bg-destructive text-destructive-foreground hover:bg-destructive/90';
  };

  const getDayDetails = (date: Date) => {
    return attendanceData.find(
      day => day.date.toDateString() === date.toDateString()
    );
  };

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours présents</CardTitle>
            <CheckCircle className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{presentDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Jours absents</CardTitle>
            <XCircle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{absentDays}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total heures</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {totalHours.toFixed(1)}h
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Calendar */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Fiche de présence - {userName}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {month.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}
          </p>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Legend */}
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-success rounded"></div>
                <span>Présent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-destructive rounded"></div>
                <span>Absent</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-muted rounded"></div>
                <span>Weekend</span>
              </div>
            </div>

            {/* Calendar Grid */}
            <Calendar
              mode="single"
              month={month}
              className="rounded-md border"
              classNames={{
                day: "h-12 w-12 p-0 font-normal aria-selected:opacity-100 relative",
                day_selected: getDayColor(new Date()),
              }}
              components={{
                Day: ({ date, ...props }) => {
                  const dayDetails = getDayDetails(date);
                  const colorClass = getDayColor(date);
                  
                  return (
                    <div
                      {...props}
                      className={`h-12 w-12 p-1 font-normal relative cursor-pointer transition-colors ${colorClass}`}
                      title={
                        dayDetails
                          ? `${dayDetails.status === 'present' ? 'Présent' : 'Absent'} - ${
                              dayDetails.arrivalTime || ''
                            } ${dayDetails.departureTime ? `- ${dayDetails.departureTime}` : ''} ${
                              dayDetails.hoursWorked ? `(${dayDetails.hoursWorked}h)` : ''
                            }`
                          : ''
                      }
                    >
                      <span className="text-xs">{date.getDate()}</span>
                      {dayDetails && dayDetails.hoursWorked && (
                        <span className="text-[10px] absolute bottom-0 left-0 right-0 text-center">
                          {dayDetails.hoursWorked.toFixed(1)}h
                        </span>
                      )}
                    </div>
                  );
                },
              }}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
};