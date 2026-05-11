- import { supabase } from "@/integrations/supabase/client";
+ // Supabase client is needed only inside useEffect – import it lazily to bypass the
+ // Vite restriction that only allows import() or import.meta at the top level.
+ // The actual client will be accessed via the imported module when needed.
+ const supabaseModule = await import("@/integrations/supabase/client");
+ const supabase = supabaseModule.supabase;