import { services as localServices, type Service } from "../data/services";
import {
  brands as localBrands,
  plans as localPlans,
  projects as localProjects,
  siteInfo as localSiteInfo,
  stats as localStats,
  testimonials as localTestimonials,
} from "../data/site";

export type Project = (typeof localProjects)[number];
export type Plan = (typeof localPlans)[number];
export type Testimonial = (typeof localTestimonials)[number];
export type Stat = (typeof localStats)[number];
export type Settings = typeof localSiteInfo;

export type Content = {
  services: Service[];
  projects: Project[];
  plans: Plan[];
  testimonials: Testimonial[];
  stats: Stat[];
  brands: string[];
  settings: Settings;
};

// Marketing content remains bundled for instant rendering. Editable CMS
// resources and site settings are loaded directly from Supabase by their
// dedicated data modules; there is no remote Django fallback anymore.
export const localContent: Content = {
  services: localServices,
  projects: localProjects,
  plans: localPlans,
  testimonials: localTestimonials,
  stats: localStats,
  brands: localBrands,
  settings: localSiteInfo,
};
