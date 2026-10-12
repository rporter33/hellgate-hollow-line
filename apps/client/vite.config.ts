import {defineConfig} from 'vite';
import {resolve} from 'node:path';
export default defineConfig({root:resolve('apps/client'),base:process.env.VITE_BASE||'./',server:{host:'0.0.0.0',port:5173},build:{outDir:'dist',emptyOutDir:true}});
