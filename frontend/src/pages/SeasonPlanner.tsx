import { useState, useEffect } from 'react';
import { getSeasonStrategy } from '../lib/api';
import type { PlayoffIssue } from '../lib/api';
import { getLeagueSettings, getRoster, getStarters, formatScoringForAPI } from '../lib/localStorage';

interface WeekProjection {
  week: number;
  projection: number;
  sos_color: 'green' | 'yellow' | 'red';
  is_playoff_week: boolean;
}

interface WeekModalProps {
  isOpen: boolean;
  onClose: () => void;
  week: number;
  playoffIssues: PlayoffIssue[];
}

function WeekModal({ isOpen, onClose, week, playoffIssues }: WeekModalProps) {
  if (!isOpen) return null;

  const weekIssues = playoffIssues.filter(issue => 
    issue.playoff_weeks.includes(week)
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            Week {week} Analysis
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            ✕
          </button>
        </div>

        {weekIssues.length > 0 ? (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Playoff Week Issues
            </h3>
            {weekIssues.map((issue, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {issue.position}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Impact: {issue.projected_impact} pts
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  {issue.issue}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  💡 {issue.suggestion}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-500 dark:text-gray-400">
              No playoff week issues detected for Week {week}
            </p>
          </div>
        )}

        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={() => {
              // TODO: Pre-load simulator with suggested moves
              onClose();
            }}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Open Simulator with Suggestions
          </button>
        </div>
      </div>
    </div>
  );
}

export default function SeasonPlanner() {
  const [playoffIssues, setPlayoffIssues] = useState<PlayoffIssue[]>([]);
  const [weeklyProjections, setWeeklyProjections] = useState<WeekProjection[]>([]);
  const [selectedWeek, setSelectedWeek] = useState<number | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadSeasonData();
  }, []);

  const loadSeasonData = async () => {
    try {
      setLoading(true);
      setError(null);

      const settings = getLeagueSettings();
      const roster = getRoster();
      const starters = getStarters();

      if (!settings || roster.length === 0) {
        setError('Please configure your league settings and roster first.');
        return;
      }

      // Load playoff issues
      const issues = await getSeasonStrategy(
        roster,
        starters,
        settings.playoff_weeks,
        formatScoringForAPI(settings.scoringSettings),
        settings.includeInjuries
      );
      setPlayoffIssues(issues);

      // Generate mock weekly projections (in a real implementation, this would come from the backend)
      const projections: WeekProjection[] = [];
      for (let week = 1; week <= 18; week++) {
        const isPlayoffWeek = settings.playoff_weeks.includes(week);
        const baseProjection = 120 + Math.random() * 40; // Mock projection between 120-160
        const sosColor = Math.random() > 0.7 ? 'red' : Math.random() > 0.4 ? 'yellow' : 'green';
        
        projections.push({
          week,
          projection: Math.round(baseProjection),
          sos_color: sosColor,
          is_playoff_week: isPlayoffWeek
        });
      }
      setWeeklyProjections(projections);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load season data');
    } finally {
      setLoading(false);
    }
  };

  const handleWeekClick = (week: number) => {
    setSelectedWeek(week);
    setIsModalOpen(true);
  };

  const getSOSColor = (color: string) => {
    switch (color) {
      case 'green': return 'bg-green-500';
      case 'yellow': return 'bg-yellow-500';
      case 'red': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500 dark:text-gray-400">Loading season data...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-8">
        <div className="text-red-600 dark:text-red-400 mb-4">{error}</div>
        <button
          onClick={loadSeasonData}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Season Planner
        </h2>
        
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Week-by-Week Projections
          </h3>
          <div className="grid grid-cols-6 md:grid-cols-9 lg:grid-cols-18 gap-2">
            {weeklyProjections.map((week) => (
              <button
                key={week.week}
                onClick={() => handleWeekClick(week.week)}
                className={`
                  p-3 rounded-lg text-center transition-all hover:scale-105
                  ${week.is_playoff_week 
                    ? 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-900/20' 
                    : 'bg-gray-50 dark:bg-gray-700'
                  }
                `}
              >
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Week {week.week}
                </div>
                <div className="text-lg font-bold text-gray-900 dark:text-white">
                  {week.projection}
                </div>
                <div className="flex justify-center mt-1">
                  <div className={`w-3 h-3 rounded-full ${getSOSColor(week.sos_color)}`} />
                </div>
                {week.is_playoff_week && (
                  <div className="text-xs text-purple-600 dark:text-purple-400 mt-1">
                    Playoff
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-green-500" />
            <span>Easy SOS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-yellow-500" />
            <span>Medium SOS</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded-full bg-red-500" />
            <span>Hard SOS</span>
          </div>
        </div>
      </div>

      {playoffIssues.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Playoff Week Issues
          </h3>
          <div className="space-y-4">
            {playoffIssues.map((issue, index) => (
              <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">
                    {issue.position}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    Impact: {issue.projected_impact} pts
                  </span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-2">
                  {issue.issue}
                </p>
                <p className="text-sm text-blue-600 dark:text-blue-400">
                  💡 {issue.suggestion}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <WeekModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        week={selectedWeek || 1}
        playoffIssues={playoffIssues}
      />
    </div>
  );
} 