import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Info, AlertCircle } from "lucide-react";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  pendingTasksCount: number;
}

export function CalendarSyncModal({ isOpen, onClose, onSync, pendingTasksCount }: CalendarSyncModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-3">
            <Calendar className="w-6 h-6 text-primary" />
            <span>Sync to Google Calendar</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Card className="bg-blue-50">
            <CardContent className="p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Sync Process</h3>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Parse task due dates and durations</li>
                <li>• Create calendar events with task details</li>
                <li>• Include gold rewards in event descriptions</li>
                <li>• Set appropriate time blocks for each task</li>
              </ul>
            </CardContent>
          </Card>

          <Card className="bg-yellow-50">
            <CardContent className="p-4">
              <p className="text-sm text-yellow-800 flex items-center space-x-2">
                <Info className="w-4 h-4" />
                <span>
                  This will sync <strong>{pendingTasksCount}</strong> pending tasks to your Google Calendar
                </span>
              </p>
            </CardContent>
          </Card>

          {pendingTasksCount === 0 && (
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <p className="text-sm text-gray-600 flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4" />
                  <span>No pending tasks with due dates found to sync.</span>
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          <Button
            className="flex-1"
            onClick={onSync}
            disabled={pendingTasksCount === 0}
          >
            Sync Now
          </Button>
          <Button variant="outline" className="flex-1" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
