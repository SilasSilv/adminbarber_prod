import { useState, useEffect } from "react";
import { PageLayout } from "@/components/layout/PageLayout";
import { StatCard } from "@/components/dashboard/StatCard";
import { TrendingUp, Calendar, Users, Scissors, DollarSign, CreditCard, Banknote, Smartphone } from "lucide-react";
- import { Notifications } from "@/pages/Notifications";
+ import Notifications from "@/pages/Notifications";
import { useBarbershop } from "@/context/BarbershopContext";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";