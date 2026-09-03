// src/utils/areas.js
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

let cachedAreas = null;
let cacheTime = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutos

export async function fetchAllAreas() {
  const now = Date.now();
  if (cachedAreas && cacheTime && (now - cacheTime) < CACHE_TTL) {
    return cachedAreas;
  }
  
  try {
    const snapshot = await getDocs(collection(db, 'areas'));
    cachedAreas = snapshot.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));
    cacheTime = now;
    return cachedAreas;
  } catch (error) {
    console.error("Error fetching areas:", error);
    return [];
  }
}

export async function searchAreas(queryText) {
  const allAreas = await fetchAllAreas();
  const search = queryText.toLowerCase().trim();
  if (!search) return allAreas;
  
  return allAreas.filter(area => 
    area.nombre?.toLowerCase().includes(search) ||
    area.id?.toLowerCase().includes(search)
  );
}

export async function getAreaById(id) {
  const allAreas = await fetchAllAreas();
  return allAreas.find(area => area.id === id) || null;
}

export async function getAreasByType(tipo) {
  const allAreas = await fetchAllAreas();
  return allAreas.filter(area => area.tipo === tipo);
}

export async function getChildAreas(parentId) {
  const allAreas = await fetchAllAreas();
  return allAreas.filter(area => area.padre === parentId);
}

export async function getAreaHierarchy(areaId) {
  const allAreas = await fetchAllAreas();
  const areaMap = {};
  allAreas.forEach(a => areaMap[a.id] = a);
  
  const hierarchy = [];
  let current = areaMap[areaId];
  
  while (current) {
    hierarchy.unshift(current.nombre);
    current = areaMap[current.padre];
  }
  
  return hierarchy;
}