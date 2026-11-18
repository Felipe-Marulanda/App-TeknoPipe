import { Component, Input } from '@angular/core';

const iconPaths = {
  dashboard: 'M3 3h8v8H3z M13 3h8v5h-8z M13 10h8v11h-8z M3 13h8v8H3z',
  clients: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75',
  categories: 'M4 5h16 M4 12h16 M4 19h16 M9 5v0 M15 12v0 M7 19v0',
  products: 'M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z M3.3 7 12 12l8.7-5 M12 22V12',
  quotations: 'M8 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-3 M16 3h5v5 M10 14 21 3 M7 8h4 M7 12h2 M7 16h4',
  history: 'M3 12a9 9 0 1 0 2.64-6.36L3 8 M3 3v5h5 M12 7v5l3 2',
  reports: 'M4 19V5 M4 19h17 M8 16v-5 M13 16V7 M18 16V3',
  users: 'M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2 M10 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8 M20 8v6 M23 11h-6',
  settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-1.7 2.94-.08-.02a1.7 1.7 0 0 0-1.69.96l-.03.08h-3.4l-.03-.08a1.7 1.7 0 0 0-1.69-.96l-.08.02-1.7-2.94.06-.06A1.7 1.7 0 0 0 9.8 15l-.08-.04v-3.4l.08-.04a1.7 1.7 0 0 0 .34-1.88l-.06-.06 1.7-2.94.08.02a1.7 1.7 0 0 0 1.69-.96l.03-.08h3.4l.03.08a1.7 1.7 0 0 0 1.69.96l.08-.02 1.7 2.94-.06.06a1.7 1.7 0 0 0-.34 1.88l.08.04v3.4z',
  logout: 'M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9',
  plus: 'M12 5v14 M5 12h14',
  search: 'M11 19a8 8 0 1 0 0-16 8 8 0 0 0 0 16z M21 21l-4.35-4.35',
  close: 'M18 6 6 18 M6 6l12 12',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4 M7 10l5 5 5-5 M12 15V3',
  edit: 'M12 20h9 M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z',
  arrow: 'M5 12h14 M12 5l7 7-7 7',
} as const;

export type IconName = keyof typeof iconPaths;

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `
    <svg
      aria-hidden="true"
      fill="none"
      stroke="currentColor"
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="1.7"
      viewBox="0 0 24 24"
    >
      <path [attr.d]="path" />
    </svg>
  `,
  styles: [
    `
      :host {
        display: inline-flex;
        width: 1.125rem;
        height: 1.125rem;
        flex: 0 0 auto;
      }

      svg {
        width: 100%;
        height: 100%;
      }
    `,
  ],
})
export class IconComponent {
  @Input({ required: true }) name!: IconName;

  get path(): string {
    return iconPaths[this.name];
  }
}
