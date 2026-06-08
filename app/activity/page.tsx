"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { DashboardLayout } from "@/components/layout";
import { PageHeader, EmptyState } from "@/components/common";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { activities as activityLogs } from "@/data/activity";
import { users } from "@/data/users";
import { ActivityLog } from "@/types";
import { 
  Search, 
  Activity,
  User,
  Building2,
  Shield,
  CreditCard,
  Mail,
  Settings,
  FileText,
  ArrowUpDown
} from "lucide-react";

type ActivityCategory = "all" | ActivityLog["category"];

export default function ActivityPage() {
  const { organization } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<ActivityCategory>("all");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");

  // Filter activity by organization
  const orgActivity = activityLogs.filter(
    (a) => a.organizationId === organization?.id
  );

  // Apply filters
  const filteredActivity = orgActivity
    .filter((activity) => {
      const matchesSearch =
        activity.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
        activity.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory =
        categoryFilter === "all" || activity.category === categoryFilter;
      return matchesSearch && matchesCategory;
    })
    .sort((a, b) => {
      const dateA = new Date(a.timestamp).getTime();
      const dateB = new Date(b.timestamp).getTime();
      return sortOrder === "desc" ? dateB - dateA : dateA - dateB;
    });

  const getCategoryIcon = (category: ActivityLog["category"]) => {
    switch (category) {
      case "user":
        return User;
      case "organization":
        return Building2;
      case "role":
        return Shield;
      case "billing":
        return CreditCard;
      case "invite":
        return Mail;
      case "settings":
        return Settings;
      default:
        return FileText;
    }
  };

  const getCategoryColor = (category: ActivityLog["category"]) => {
    switch (category) {
      case "user":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
      case "organization":
        return "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400";
      case "role":
        return "bg-primary/10 text-primary dark:bg-primary/30 dark:text-primary";
      case "billing":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      case "invite":
        return "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400";
      case "settings":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400";
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <PageHeader
          title="Activity Log"
          description="Track all actions and changes in your organization"
        />

        {/* Activity List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5" />
              Recent Activity ({filteredActivity.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col sm:flex-row gap-4 mb-6">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search activity..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v as ActivityCategory)}
              >
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="user">User</SelectItem>
                  <SelectItem value="organization">Organization</SelectItem>
                  <SelectItem value="role">Role</SelectItem>
                  <SelectItem value="billing">Billing</SelectItem>
                  <SelectItem value="invite">Invite</SelectItem>
                  <SelectItem value="settings">Settings</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant="outline"
                onClick={() =>
                  setSortOrder((prev) => (prev === "desc" ? "asc" : "desc"))
                }
              >
                <ArrowUpDown className="mr-2 h-4 w-4" />
                {sortOrder === "desc" ? "Newest First" : "Oldest First"}
              </Button>
            </div>

            {/* Activity List */}
            {filteredActivity.length === 0 ? (
              <EmptyState
                icon={Activity}
                title="No activity found"
                description={
                  searchQuery || categoryFilter !== "all"
                    ? "Try adjusting your search or filters"
                    : "Activity will appear here as actions are performed"
                }
              />
            ) : (
              <div className="space-y-4">
                {filteredActivity.map((activity) => {
                  const actor = users.find((u) => u.id === activity.actorId);
                  const CategoryIcon = getCategoryIcon(activity.category);

                  return (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors"
                    >
                      {/* Actor Avatar */}
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={actor?.avatar} alt={actor?.name} />
                        <AvatarFallback>
                          {actor?.name
                            ?.split(" ")
                            .map((n) => n[0])
                            .join("") || "?"}
                        </AvatarFallback>
                      </Avatar>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="font-medium">
                              {actor?.name || "Unknown User"}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {activity.description}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge
                              variant="secondary"
                              className={`${getCategoryColor(activity.category)} border-0`}
                            >
                              <CategoryIcon className="mr-1 h-3 w-3" />
                              {activity.category}
                            </Badge>
                            <span className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatTimestamp(activity.timestamp)}
                            </span>
                          </div>
                        </div>

                        {/* Metadata */}
                        {activity.metadata && (
                          <div className="mt-2 flex flex-wrap gap-2">
                            {Object.entries(activity.metadata).map(
                              ([key, value]) => (
                                <Badge
                                  key={key}
                                  variant="outline"
                                  className="text-xs"
                                >
                                  {key}: {String(value)}
                                </Badge>
                              )
                            )}
                          </div>
                        )}

                        {/* IP Address */}
                        {activity.ipAddress && (
                          <p className="mt-1 text-xs text-muted-foreground">
                            IP: {activity.ipAddress}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
