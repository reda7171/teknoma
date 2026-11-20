import {PET_CATEGORIES} from '@/lib/pets'
export type CategoryTree = {[category:string]:string[]}
export const CATEGORIES:CategoryTree = PET_CATEGORIES
export const MAIN_CATEGORIES = Object.keys(CATEGORIES)
