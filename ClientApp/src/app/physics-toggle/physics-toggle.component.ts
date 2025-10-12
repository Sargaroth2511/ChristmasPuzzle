import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-physics-toggle',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './physics-toggle.component.html',
  styleUrls: ['./physics-toggle.component.scss']
})
export class PhysicsToggleComponent {
  @Input() useMatterPhysics = false;
  @Input() disabled = false;
  @Output() togglePhysics = new EventEmitter<boolean>();

  onToggle(): void {
    if (!this.disabled) {
      this.togglePhysics.emit(!this.useMatterPhysics);
    }
  }

  get modeText(): string {
    return this.useMatterPhysics ? 'Matter.js' : 'Arcade';
  }

  get modeDescription(): string {
    return this.useMatterPhysics 
      ? 'Realistic Physics' 
      : 'Simple Physics';
  }
}
