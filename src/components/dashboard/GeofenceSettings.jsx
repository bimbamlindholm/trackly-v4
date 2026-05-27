import { MapPin } from "lucide-react";
import SettingsInput from "./SettingsInput";

/**
 * GPS Geofencing boundaries settings component.
 * Features office coordinate setups, custom radius metrics, and physical coordinate detection tools.
 */
export default function GeofenceSettings({
  geofenceEnabled,
  geofenceLatitude,
  geofenceLongitude,
  geofenceRadiusMeters,
  onUpdateSetting,
}) {
  const handleDetectLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          onUpdateSetting("geofenceLatitude", Number(position.coords.latitude.toFixed(6)));
          onUpdateSetting("geofenceLongitude", Number(position.coords.longitude.toFixed(6)));
        },
        () => {
          alert("Failed to fetch location. Please ensure site permissions are granted.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser.");
    }
  };

  return (
    <div className="mt-8 border-t border-white/10 pt-6 text-left">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2 uppercase tracking-wider">
            <span className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse" />
            Geofencing Guard & GPS Radius Lock
          </h3>
          <p className="mt-1 text-xs text-slate-400">
            Prevent clock-ins if employees are outside the company's designated geographic boundary.
          </p>
        </div>
        
        {/* Enable Switch */}
        <label className="flex items-center gap-3 cursor-pointer shrink-0">
          <span className="text-xs font-semibold text-slate-300">Enable GPS Guard</span>
          <button
            type="button"
            onClick={() => onUpdateSetting("geofenceEnabled", !geofenceEnabled)}
            className={`relative h-7 w-12 rounded-full transition cursor-pointer ${geofenceEnabled ? "bg-cyan-400" : "bg-slate-700"}`}
          >
            <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${geofenceEnabled ? "left-6" : "left-1"}`} />
          </button>
        </label>
      </div>

      {geofenceEnabled && (
        <div className="mt-5 rounded-xl border border-indigo-500/10 bg-indigo-500/[0.02] p-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 items-end">
            <SettingsInput
              label="Office GPS Latitude"
              type="number"
              step="0.000001"
              placeholder="e.g. 14.599512"
              value={geofenceLatitude}
              onChange={(val) => onUpdateSetting("geofenceLatitude", val ? Number(val) : null)}
              required={geofenceEnabled}
            />
            <SettingsInput
              label="Office GPS Longitude"
              type="number"
              step="0.000001"
              placeholder="e.g. 120.984222"
              value={geofenceLongitude}
              onChange={(val) => onUpdateSetting("geofenceLongitude", val ? Number(val) : null)}
              required={geofenceEnabled}
            />
            <SettingsInput
              label="Allowed Radius (Meters)"
              type="number"
              min="10"
              max="10000"
              placeholder="e.g. 100"
              value={geofenceRadiusMeters}
              onChange={(val) => onUpdateSetting("geofenceRadiusMeters", val ? Number(val) : 100)}
              required={geofenceEnabled}
            />
            
            {/* Detect Location Button */}
            <button
              type="button"
              onClick={handleDetectLocation}
              className="h-12 w-full rounded-xl border border-cyan-500/20 bg-cyan-500/5 hover:bg-cyan-500/10 hover:border-cyan-400/40 text-cyan-400 text-xs font-black transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <MapPin size={14} /> Detect Office Location
            </button>
          </div>
          <p className="mt-2.5 text-[10px] text-slate-500 leading-normal">
            Employees must clock in within <span className="text-cyan-300 font-bold">{geofenceRadiusMeters || 100} meters</span> of this coordinate. Click "Detect Office Location" while physically at the office to automatically set these coordinates.
          </p>
        </div>
      )}
    </div>
  );
}
