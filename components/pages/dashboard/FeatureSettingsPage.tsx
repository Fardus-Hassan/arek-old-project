import FeatureSettingsForm from "@/components/features/dashboard/feature-settings/FeatureSettingsForm";
import ModelPositionSection from "@/components/features/dashboard/feature-settings/ModelPositionSection";

export default function FeatureSettingsPage() {
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <ModelPositionSection />
      <FeatureSettingsForm />
    </div>
  );
}
