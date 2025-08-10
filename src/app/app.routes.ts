import { Routes } from '@angular/router';
import { HomeComponent } from './home/home.component';
import { LibraryComponent } from './library/library.component';
import { StatsComponent } from './stats/stats.component';
import { PracticeComponent } from './practice/practice.component';
import { UploadComponent } from './upload/upload.component';

export const routes: Routes = [
    {
        path: "", component: HomeComponent
    },
    {
        path: "home", component: HomeComponent
    },
    {
        path: "library", component: LibraryComponent
    },
    {
        path: "stats", component: StatsComponent
    },
    {
        path: "practice", component: PracticeComponent
    },
    {
        path: "upload", component: UploadComponent
    },
    {
        path: "**", component: HomeComponent
    }
];