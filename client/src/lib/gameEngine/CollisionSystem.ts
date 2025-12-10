export interface GameObject {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class CollisionSystem {
  public checkCollision(obj1: GameObject, obj2: GameObject): boolean {
    return (
      obj1.x - obj1.width / 2 < obj2.x + obj2.width / 2 &&
      obj1.x + obj1.width / 2 > obj2.x - obj2.width / 2 &&
      obj1.y - obj1.height / 2 < obj2.y + obj2.height / 2 &&
      obj1.y + obj1.height / 2 > obj2.y - obj2.height / 2
    );
  }
}
