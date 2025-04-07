import { Card } from '@/components/ui/card';

export default function Analytics() {
  return (
    <div>
      <h2 className="text-2xl font-medium mb-6">Analytics</h2>
      
      <Card className="p-8 text-center">
        <span className="material-icons text-6xl text-neutral-300 mb-4">insights</span>
        <h3 className="text-xl font-medium mb-2">Analytics Coming Soon</h3>
        <p className="text-neutral-600">
          The analytics dashboard is currently under development. <br />
          Check back later for detailed data analysis and insights.
        </p>
      </Card>
    </div>
  );
}
