import { services as localServices, type Service } from "../data/services";
import {
  brands as localBrands,
  plans as localPlans,
  projects as localProjects,
  siteInfo as localSiteInfo,
  stats as localStats,
  testimonials as localTestimonials,
} from "../data/site";

export type Project = {
  id?: string;
  slug?: string;
  title: string;
  titleEn?: string;
  desc: string;
  descEn?: string;
  tag: string;
  tagEn?: string;
  image: string;
  site: string;
  accent: string;
  client?: string;
  clientEn?: string;
  technologies?: string;
  completedAt?: string;
  challenge?: string;
  challengeEn?: string;
  solution?: string;
  solutionEn?: string;
  results?: string;
  resultsEn?: string;
};
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
  projects: localProjects as Project[],
  plans: localPlans,
  testimonials: localTestimonials,
  stats: localStats,
  brands: localBrands,
  settings: localSiteInfo,
};
