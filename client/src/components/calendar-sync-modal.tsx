import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Info, AlertCircle, ExternalLink } from "lucide-react";
import { Link } from "wouter";

interface CalendarSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSync: () => void;
  selectedTasksCount: number;
  needsGoogleAuth?: boolean;
}

export function CalendarSyncModal({ isOpen, onClose, onSync, selectedTasksCount, needsGoogleAuth = false }: CalendarSyncModalProps) {
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
          {needsGoogleAuth ? (
            <Card className="bg-red-50">
              <CardContent className="p-4">
                <div className="flex items-center space-x-2 mb-3">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <h3 className="font-semibold text-red-900">Google Calendar Not Connected</h3>
                </div>
                <p className="text-sm text-red-800 mb-3">
                  You need to connect your Google Calendar before you can sync tasks. 
                  This enables time blocking and automatic event creation.
                </p>
                <Link href="/settings">
                  <Button variant="outline" className="w-full text-red-700 border-red-300 hover:bg-red-100">
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Go to Settings to Connect
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="bg-blue-50">
                <CardContent className="p-4">
                  <h3 className="font-semibold text-gray-900 mb-2">Sync Process</h3>
                  <ul className="text-sm text-gray-600 space-y-1">
                    <li>• Parse task due dates and durations</li>
                    <li>• Create calendar events with task details</li>
                    <li>• Include gold rewards in event descriptions</li>
                    <li>• Set appropriate time blocks for each task</li>
                    <li>• Color-code events by importance level</li>
                  </ul>
                </CardContent>
              </Card>

              <Card className="bg-yellow-50">
                <CardContent className="p-4">
                  <p className="text-sm text-yellow-800 flex items-center space-x-2">
                    <Info className="w-4 h-4" />
                    <span>
                      This will sync <strong>{selectedTasksCount}</strong> selected tasks to your Google Calendar
                    </span>
                  </p>
                </CardContent>
              </Card>

              {selectedTasksCount === 0 && (
                <Card className="bg-gray-50">
                  <CardContent className="p-4">
                    <p className="text-sm text-gray-600 flex items-center space-x-2">
                      <AlertCircle className="w-4 h-4" />
                      <span>No tasks selected for sync. Please select tasks first.</span>
                    </p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>

        <div className="flex space-x-3 pt-4">
          {!needsGoogleAuth && (
            <Button
              className="flex-1"
              onClick={onSync}
              disabled={selectedTasksCount === 0}
            >
              Sync Now
            </Button>
          )}
          <Button variant="outline" className="flex-1" onClick={onClose}>
            {needsGoogleAuth ? 'Close' : 'Cancel'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}