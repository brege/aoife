import { Combobox } from '@headlessui/react';
import type React from 'react';
import { useEffect, useState } from 'react';
import type { Control, UseFormSetValue } from 'react-hook-form';
import { useController, useWatch } from 'react-hook-form';
import { FaLink } from 'react-icons/fa';
import type { MediaSearchValues } from '../../../providers/types';
import {
  fetchArtistReleaseGroups,
  fetchSuggestions,
  normalizeTitleKey,
  parseMusicBrainzArtistSuggestions,
  type ReleaseGroupEntry,
  type SuggestionEntry,
  scoreTitleMatch,
} from './suggestions';

type ArtistField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type AlbumField = {
  id: string;
  label: string;
  placeholder: string;
  required?: boolean;
};

type MusicFormProps = {
  artistField: ArtistField;
  albumField: AlbumField;
  layout: 'band' | 'stack';
  bandPlacement: 'top' | 'bottom';
  formRef: React.RefObject<HTMLFormElement>;
  onOpenCoverLink?: () => void;
  control: Control<MediaSearchValues>;
  setValue: UseFormSetValue<MediaSearchValues>;
};

const MusicForm = ({
  artistField,
  albumField,
  layout,
  bandPlacement,
  formRef,
  onOpenCoverLink,
  control,
  setValue,
}: MusicFormProps) => {
  const watchedArtistValue = useWatch({
    control,
    name: artistField.id as keyof MediaSearchValues,
  });
  const watchedAlbumValue = useWatch({
    control,
    name: albumField.id as keyof MediaSearchValues,
  });
  const { field: artistController } = useController({
    name: artistField.id as keyof MediaSearchValues,
    control,
  });
  const { field: albumController } = useController({
    name: albumField.id as keyof MediaSearchValues,
    control,
  });
  const [artistSuggestions, setArtistSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [albumSuggestions, setAlbumSuggestions] = useState<SuggestionEntry[]>(
    [],
  );
  const [isLoadingArtistSuggestions, setIsLoadingArtistSuggestions] =
    useState(false);
  const [isLoadingAlbumSuggestions, setIsLoadingAlbumSuggestions] =
    useState(false);
  const [artistReleaseGroups, setArtistReleaseGroups] = useState<{
    artistId: string;
    entries: ReleaseGroupEntry[];
  } | null>(null);
  const [isLoadingArtistReleaseGroups, setIsLoadingArtistReleaseGroups] =
    useState(false);
  const [selectedArtistIdentifier, setSelectedArtistIdentifier] = useState<
    string | null
  >(null);

  useEffect(() => {
    const resolvedArtistValue =
      typeof watchedArtistValue === 'string' ? watchedArtistValue : '';
    const trimmedArtist = resolvedArtistValue.trim();
    if (trimmedArtist.length < 2) {
      setArtistSuggestions([]);
      setSelectedArtistIdentifier(null);
      setAlbumSuggestions([]);
      return;
    }

    let isCancelled = false;
    const requestKey = `music-artist|${trimmedArtist}`;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingArtistSuggestions(true);
      const params = new URLSearchParams({
        query: `artist:"${trimmedArtist}"`,
        fmt: 'json',
        limit: '8',
      });
      const endpoint = `https://musicbrainz.org/ws/2/artist?${params.toString()}`;

      fetchSuggestions(requestKey, endpoint, parseMusicBrainzArtistSuggestions)
        .then((mapped) => {
          if (isCancelled) {
            return;
          }
          setArtistSuggestions(mapped);
        })
        .finally(() => {
          if (!isCancelled) {
            setIsLoadingArtistSuggestions(false);
          }
        });
    }, 350);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [watchedArtistValue]);

  useEffect(() => {
    if (!selectedArtistIdentifier) {
      setArtistReleaseGroups(null);
      setIsLoadingArtistReleaseGroups(false);
      return;
    }

    let isCancelled = false;
    setIsLoadingArtistReleaseGroups(true);
    fetchArtistReleaseGroups(selectedArtistIdentifier)
      .then((entries) => {
        if (isCancelled) {
          return;
        }
        setArtistReleaseGroups({
          artistId: selectedArtistIdentifier,
          entries,
        });
      })
      .finally(() => {
        if (!isCancelled) {
          setIsLoadingArtistReleaseGroups(false);
        }
      });

    return () => {
      isCancelled = true;
    };
  }, [selectedArtistIdentifier]);

  useEffect(() => {
    const resolvedAlbumValue =
      typeof watchedAlbumValue === 'string' ? watchedAlbumValue : '';
    const trimmedAlbum = resolvedAlbumValue.trim();
    if (!selectedArtistIdentifier || trimmedAlbum.length < 2) {
      setAlbumSuggestions([]);
      setIsLoadingAlbumSuggestions(false);
      return;
    }

    let isCancelled = false;
    const normalizedQuery = normalizeTitleKey(trimmedAlbum);
    const activeReleaseGroups =
      artistReleaseGroups?.artistId === selectedArtistIdentifier
        ? artistReleaseGroups.entries
        : [];

    setIsLoadingAlbumSuggestions(true);
    const timeoutId = window.setTimeout(() => {
      if (activeReleaseGroups.length > 0) {
        const mapped = activeReleaseGroups
          .map((entry) => {
            const normalizedTitle = normalizeTitleKey(entry.title);
            const score = scoreTitleMatch(normalizedQuery, normalizedTitle);
            if (normalizedQuery && score === 0) {
              return null;
            }
            const label = entry.year
              ? `${entry.title} (${entry.year})`
              : entry.title;
            return {
              id: entry.id,
              label,
              value: entry.title,
              score,
            };
          })
          .filter(
            (
              entry,
            ): entry is {
              id: string;
              label: string;
              value: string;
              score: number;
            } => entry !== null,
          );

        mapped.sort((left, right) => {
          if (left.score !== right.score) {
            return right.score - left.score;
          }
          return left.label.localeCompare(right.label);
        });

        if (!isCancelled) {
          setAlbumSuggestions(
            mapped.slice(0, 8).map((entry) => ({
              id: entry.id,
              label: entry.label,
              value: entry.value,
            })),
          );
          setIsLoadingAlbumSuggestions(false);
        }
        return;
      }

      if (!isLoadingArtistReleaseGroups) {
        setAlbumSuggestions([]);
        setIsLoadingAlbumSuggestions(false);
      }
    }, 200);

    return () => {
      isCancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [
    watchedAlbumValue,
    artistReleaseGroups,
    isLoadingArtistReleaseGroups,
    selectedArtistIdentifier,
  ]);

  const comboboxPlacementClass =
    layout === 'band' ? `band-${bandPlacement}` : 'stack';

  return (
    <>
      <Combobox
        value={typeof watchedArtistValue === 'string' ? watchedArtistValue : ''}
        onChange={(nextValue) => {
          const resolvedValue = nextValue ?? '';
          artistController.onChange(resolvedValue);
          if (!resolvedValue) {
            setSelectedArtistIdentifier(null);
            setAlbumSuggestions([]);
            setArtistReleaseGroups(null);
            setIsLoadingAlbumSuggestions(false);
            setValue('releaseGroupId', '');
            return;
          }
          const matchingSuggestion = artistSuggestions.find(
            (suggestion) => suggestion.value === resolvedValue,
          );
          if (!matchingSuggestion) {
            throw new Error('Selected artist not found in suggestions');
          }
          if (typeof matchingSuggestion.id !== 'string') {
            throw new Error('Invalid MusicBrainz artist identifier');
          }
          setSelectedArtistIdentifier(matchingSuggestion.id);
          setAlbumSuggestions([]);
          setArtistReleaseGroups(null);
          setIsLoadingAlbumSuggestions(false);
          setValue('releaseGroupId', '');
        }}
        as="div"
        className={`combobox ${comboboxPlacementClass}`.trim()}
      >
        <Combobox.Input
          type="text"
          value={
            typeof watchedArtistValue === 'string' ? watchedArtistValue : ''
          }
          onChange={(event) => {
            artistController.onChange(event);
            setSelectedArtistIdentifier(null);
            setAlbumSuggestions([]);
            setIsLoadingAlbumSuggestions(false);
            setValue('releaseGroupId', '');
          }}
          placeholder={artistField.placeholder}
          aria-label={artistField.label}
          className="form-input"
          required={artistField.required}
          data-testid={`search-field-${artistField.id}`}
        />
        {artistSuggestions.length > 0 && (
          <Combobox.Options className="combobox-options">
            {artistSuggestions.map((suggestion) => {
              return (
                <Combobox.Option
                  key={suggestion.id}
                  value={suggestion.value}
                  className={({ active }) =>
                    `combobox-option${active ? ' active' : ''}`
                  }
                >
                  <span className="combobox-option-label">
                    {suggestion.label}
                  </span>
                </Combobox.Option>
              );
            })}
          </Combobox.Options>
        )}
        {isLoadingArtistSuggestions && artistSuggestions.length === 0 && (
          <div className="combobox-loading">Searching...</div>
        )}
      </Combobox>

      <div className="input-with-button">
        <Combobox
          value={typeof watchedAlbumValue === 'string' ? watchedAlbumValue : ''}
          onChange={(nextValue) => {
            const resolvedValue = nextValue ?? '';
            albumController.onChange(resolvedValue);
            if (!resolvedValue) {
              setValue('releaseGroupId', '');
            } else {
              const matchingSuggestion = albumSuggestions.find(
                (suggestion) => suggestion.value === resolvedValue,
              );
              if (
                matchingSuggestion &&
                typeof matchingSuggestion.id === 'string'
              ) {
                setValue('releaseGroupId', matchingSuggestion.id);
              } else {
                setValue('releaseGroupId', '');
              }
            }
            window.setTimeout(() => {
              formRef.current?.requestSubmit();
            }, 0);
          }}
          as="div"
          className={`combobox ${comboboxPlacementClass}`.trim()}
        >
          <Combobox.Input
            type="text"
            value={
              typeof watchedAlbumValue === 'string' ? watchedAlbumValue : ''
            }
            onChange={(event) => {
              albumController.onChange(event);
              setValue('releaseGroupId', '');
            }}
            placeholder={albumField.placeholder}
            aria-label={albumField.label}
            className="form-input"
            required={albumField.required}
            data-testid={`search-field-${albumField.id}`}
          />
          {albumSuggestions.length > 0 && (
            <Combobox.Options className="combobox-options">
              {albumSuggestions.map((suggestion) => {
                return (
                  <Combobox.Option
                    key={suggestion.id}
                    value={suggestion.value}
                    className={({ active }) =>
                      `combobox-option${active ? ' active' : ''}`
                    }
                  >
                    <span className="combobox-option-label">
                      {suggestion.label}
                    </span>
                  </Combobox.Option>
                );
              })}
            </Combobox.Options>
          )}
          {isLoadingAlbumSuggestions && albumSuggestions.length === 0 && (
            <div className="combobox-loading">Searching...</div>
          )}
        </Combobox>
        {onOpenCoverLink && (
          <button
            type="button"
            onClick={onOpenCoverLink}
            className="icon-button"
            aria-label="Add cover link"
            title="Add cover link"
          >
            <FaLink size={18} />
          </button>
        )}
      </div>
    </>
  );
};

export { MusicForm };
